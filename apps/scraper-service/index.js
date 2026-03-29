const express = require('express');
const { existsSync } = require('node:fs');
const { chromium } = require('playwright');

const app = express();
const port = process.env.PORT || 3000;
const DEFAULT_PLAYWRIGHT_BROWSERS_PATH = '/tmp/pw-cache/ms-playwright';
const SNAPIFY_MAX_RENDER_WIDTH = 2400;
const SNAPIFY_MAX_RENDER_HEIGHT = 12000;
const SNAPIFY_MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;
const SNAPIFY_MAX_PDF_BYTES = 12 * 1024 * 1024;
const YOUTUBE_DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
const YOUTUBE_MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36';

app.use(express.json({ limit: '256kb' }));

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pseudoRank(keyword, videoUrl) {
  const signal = `${keyword}:${videoUrl}`.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return (signal % 40) + 1;
}

function extractYouTubeVideoId(videoUrl) {
  try {
    const url = new URL(videoUrl);
    if (url.hostname === 'youtu.be') {
      return url.pathname.replace(/^\/+/, '').slice(0, 11);
    }

    const direct = url.searchParams.get('v');
    if (direct) {
      return direct.slice(0, 11);
    }

    const parts = url.pathname.split('/').filter(Boolean);
    const embedIndex = parts.findIndex((part) => part === 'embed' || part === 'shorts');
    if (embedIndex >= 0 && parts[embedIndex + 1]) {
      return parts[embedIndex + 1].slice(0, 11);
    }

    return '';
  } catch {
    return '';
  }
}

function toHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return 'invalid-url';
  }
}

function decodeHtmlEntities(text) {
  return text
    .replace(/\\u0026/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function buildYouTubeHeaders(profile) {
  return {
    'user-agent': profile === 'mobile' ? YOUTUBE_MOBILE_UA : YOUTUBE_DESKTOP_UA,
    'accept-language': 'en-US,en;q=0.9'
  };
}

function extractBalancedJsonBlock(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  let index = markerIndex + marker.length;
  while (index < source.length && /\s/.test(source[index])) {
    index += 1;
  }

  const opener = source[index];
  if (opener !== '{' && opener !== '[') {
    return null;
  }

  const closer = opener === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let cursor = index; cursor < source.length; cursor += 1) {
    const char = source[cursor];

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }

      if (char === '\\') {
        escape = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === opener) {
      depth += 1;
      continue;
    }

    if (char === closer) {
      depth -= 1;
      if (depth === 0) {
        return source.slice(index, cursor + 1);
      }
    }
  }

  return null;
}

function extractTextValue(node) {
  if (!node) {
    return '';
  }

  if (typeof node === 'string') {
    return decodeHtmlEntities(node.trim());
  }

  if (typeof node.simpleText === 'string') {
    return decodeHtmlEntities(node.simpleText.trim());
  }

  if (Array.isArray(node.runs)) {
    return decodeHtmlEntities(
      node.runs
        .map((run) => (typeof run?.text === 'string' ? run.text : ''))
        .join('')
        .trim()
    );
  }

  return '';
}

function extractThumbnailUrl(renderer) {
  const thumbnails = renderer?.thumbnail?.thumbnails;
  if (!Array.isArray(thumbnails) || !thumbnails.length) {
    return '';
  }

  return thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url || '';
}

function collectVideoRenderers(node, renderers = []) {
  if (!node || typeof node !== 'object') {
    return renderers;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      collectVideoRenderers(item, renderers);
    }
    return renderers;
  }

  if (node.videoRenderer && typeof node.videoRenderer === 'object') {
    renderers.push(node.videoRenderer);
  }

  for (const value of Object.values(node)) {
    collectVideoRenderers(value, renderers);
  }

  return renderers;
}

function normalizeVideoRenderer(renderer, seen) {
  const videoId = typeof renderer?.videoId === 'string' ? renderer.videoId.trim() : '';
  if (!videoId || seen.has(videoId)) {
    return null;
  }

  seen.add(videoId);
  return {
    videoId,
    title: extractTextValue(renderer.title),
    url: `https://www.youtube.com/watch?v=${videoId}`,
    channelTitle: extractTextValue(renderer.ownerText),
    durationText: extractTextValue(renderer.lengthText),
    publishedTimeText: extractTextValue(renderer.publishedTimeText),
    viewCountText: extractTextValue(renderer.viewCountText),
    thumbnailUrl: extractThumbnailUrl(renderer)
  };
}

function parseYouTubeInitialDataResults(html) {
  const markers = ['var ytInitialData = ', 'window["ytInitialData"] = ', 'ytInitialData = '];
  let initialData = null;

  for (const marker of markers) {
    const jsonBlock = extractBalancedJsonBlock(html, marker);
    if (!jsonBlock) {
      continue;
    }

    try {
      initialData = JSON.parse(jsonBlock);
      break;
    } catch {
      // try next marker
    }
  }

  if (!initialData) {
    return [];
  }

  const seen = new Set();
  const renderers = collectVideoRenderers(initialData);
  const results = [];

  for (const renderer of renderers) {
    const normalized = normalizeVideoRenderer(renderer, seen);
    if (!normalized) {
      continue;
    }

    results.push(normalized);
    if (results.length >= 25) {
      break;
    }
  }

  return results;
}

function parseYouTubeRegexResults(html) {
  const results = [];
  const seen = new Set();
  const regex =
    /"videoRenderer":\{"videoId":"([^"]+)".{0,1200}?"title":\{"(?:runs":\[\{"text":"([^"]+)"|simpleText":"([^"]+)")/g;
  let match;

  while ((match = regex.exec(html)) && results.length < 25) {
    const videoId = match[1];
    if (!videoId || seen.has(videoId)) {
      continue;
    }

    seen.add(videoId);
    results.push({
      videoId,
      title: decodeHtmlEntities((match[2] || match[3] || '').trim()),
      url: `https://www.youtube.com/watch?v=${videoId}`,
      channelTitle: '',
      durationText: '',
      publishedTimeText: '',
      viewCountText: '',
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    });
  }

  return results;
}

function parseYouTubeMobileAnchorResults(html) {
  const results = [];
  const seen = new Set();
  const regex = /href="\/watch\?v=([A-Za-z0-9_-]{11})[^"]*"[^>]*title="([^"]+)"/g;
  let match;

  while ((match = regex.exec(html)) && results.length < 25) {
    const videoId = match[1];
    if (!videoId || seen.has(videoId)) {
      continue;
    }

    seen.add(videoId);
    results.push({
      videoId,
      title: decodeHtmlEntities(match[2].trim()),
      url: `https://www.youtube.com/watch?v=${videoId}`,
      channelTitle: '',
      durationText: '',
      publishedTimeText: '',
      viewCountText: '',
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    });
  }

  return results;
}

async function fetchYouTubeVideoMetadata(videoUrl) {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
  try {
    const response = await fetch(oembedUrl, {
      headers: buildYouTubeHeaders('desktop')
    });

    if (!response.ok) {
      return null;
    }

    const body = await response.json();
    return {
      title: typeof body?.title === 'string' ? body.title : '',
      authorName: typeof body?.author_name === 'string' ? body.author_name : '',
      providerName: typeof body?.provider_name === 'string' ? body.provider_name : '',
      thumbnailUrl: typeof body?.thumbnail_url === 'string' ? body.thumbnail_url : ''
    };
  } catch {
    return null;
  }
}

async function fetchYouTubeSearchEvidence(keyword, targetVideoId) {
  const strategies = [
    {
      id: 'desktop-initial-data',
      searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`,
      headers: buildYouTubeHeaders('desktop'),
      parser: parseYouTubeInitialDataResults
    },
    {
      id: 'desktop-regex-fallback',
      searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`,
      headers: buildYouTubeHeaders('desktop'),
      parser: parseYouTubeRegexResults
    },
    {
      id: 'mobile-anchor-fallback',
      searchUrl: `https://m.youtube.com/results?search_query=${encodeURIComponent(keyword)}`,
      headers: buildYouTubeHeaders('mobile'),
      parser: parseYouTubeMobileAnchorResults
    }
  ];

  const attempts = [];
  let best = null;

  for (const strategy of strategies) {
    try {
      const response = await fetch(strategy.searchUrl, { headers: strategy.headers });
      const html = await response.text();

      if (!response.ok) {
        attempts.push({
          strategy: strategy.id,
          searchUrl: strategy.searchUrl,
          status: response.status,
          success: false,
          resultCount: 0,
          matchedTarget: false,
          error: `youtube search request failed with status ${response.status}`
        });
        continue;
      }

      const results = strategy.parser(html);
      const matchedTarget = results.some((result) => result.videoId === targetVideoId);
      const attempt = {
        strategy: strategy.id,
        searchUrl: strategy.searchUrl,
        status: response.status,
        success: results.length > 0,
        resultCount: results.length,
        matchedTarget,
        htmlBytes: Buffer.byteLength(html, 'utf8')
      };
      attempts.push(attempt);

      if (results.length && !best) {
        best = {
          strategy: strategy.id,
          searchUrl: strategy.searchUrl,
          results,
          attempts
        };
      }

      if (matchedTarget) {
        return {
          strategy: strategy.id,
          searchUrl: strategy.searchUrl,
          results,
          attempts
        };
      }
    } catch (error) {
      attempts.push({
        strategy: strategy.id,
        searchUrl: strategy.searchUrl,
        status: null,
        success: false,
        resultCount: 0,
        matchedTarget: false,
        error: error instanceof Error ? error.message : 'Unknown YouTube search failure'
      });
    }
  }

  if (best) {
    return best;
  }

  const attemptSummary = attempts.map((attempt) => `${attempt.strategy}:${attempt.error || attempt.resultCount}`).join(', ');
  throw new Error(
    attemptSummary
      ? `youtube search did not yield parseable results (${attemptSummary})`
      : 'youtube search page did not expose parseable video results'
  );
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlEntities(match[1].replace(/\s+/g, ' ').trim()) : '';
}

function extractDescription(html) {
  const match = html.match(
    /<meta[^>]+(?:name|property)=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i
  );
  return match ? decodeHtmlEntities(match[1].trim()) : '';
}

async function fetchPageEvidence(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'accept-language': 'en-US,en;q=0.9'
    }
  });

  const html = await response.text();
  const finalUrl = response.url || url;
  const title = extractTitle(html);
  const description = extractDescription(html);

  return {
    requestedUrl: url,
    finalUrl,
    ok: response.ok,
    status: response.status,
    title,
    description,
    contentType: response.headers.get('content-type') || '',
    htmlBytes: Buffer.byteLength(html, 'utf8'),
    htmlPreview: html.slice(0, 2000),
    checkedAt: new Date().toISOString()
  };
}

function ensurePlaywrightBrowsersPath() {
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync(DEFAULT_PLAYWRIGHT_BROWSERS_PATH)) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = DEFAULT_PLAYWRIGHT_BROWSERS_PATH;
  }
}

async function launchRenderingBrowser() {
  ensurePlaywrightBrowsersPath();
  return chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
}

function toBase64Artifact(buffer, mimeType, filename, metadata = {}) {
  return {
    mimeType,
    filename,
    encoding: 'base64',
    byteLength: buffer.length,
    base64: buffer.toString('base64'),
    ...metadata
  };
}

function assertSnapifyRenderBudget(metadata, screenshotBytes = 0, pdfBytes = 0) {
  if (metadata.width > SNAPIFY_MAX_RENDER_WIDTH || metadata.height > SNAPIFY_MAX_RENDER_HEIGHT) {
    throw new Error(
      `page dimensions exceed capture budget (${metadata.width}x${metadata.height}, max ${SNAPIFY_MAX_RENDER_WIDTH}x${SNAPIFY_MAX_RENDER_HEIGHT})`
    );
  }

  if (screenshotBytes > SNAPIFY_MAX_SCREENSHOT_BYTES) {
    throw new Error(
      `screenshot artifact exceeds byte budget (${screenshotBytes} > ${SNAPIFY_MAX_SCREENSHOT_BYTES})`
    );
  }

  if (pdfBytes > SNAPIFY_MAX_PDF_BYTES) {
    throw new Error(`pdf artifact exceeds byte budget (${pdfBytes} > ${SNAPIFY_MAX_PDF_BYTES})`);
  }
}

async function renderPageArtifacts(browser, url) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    screen: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    locale: 'en-US'
  });

  const page = await context.newPage();

  try {
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => undefined);
    await page.emulateMedia({ media: 'screen' });
    await page.waitForTimeout(250);

    const html = await page.content();
    const metadata = await page.evaluate(() => {
      const queryMeta = (selector) => document.querySelector(selector)?.getAttribute('content') || '';
      const bodyText = document.body?.innerText || '';
      return {
        title: document.title || '',
        description:
          queryMeta('meta[name="description"]') || queryMeta('meta[property="og:description"]'),
        width: document.documentElement?.scrollWidth || 0,
        height: document.documentElement?.scrollHeight || 0,
        bodyTextPreview: bodyText.replace(/\s+/g, ' ').trim().slice(0, 400)
      };
    });

    const finalUrl = page.url() || response?.url() || url;
    assertSnapifyRenderBudget({
      width: metadata.width,
      height: metadata.height
    });
    const screenshot = await page.screenshot({ fullPage: true, type: 'png' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '0.4in',
        right: '0.4in',
        bottom: '0.4in',
        left: '0.4in'
      }
    });
    assertSnapifyRenderBudget(
      {
        width: metadata.width,
        height: metadata.height
      },
      screenshot.length,
      pdf.length
    );

    return {
      url,
      finalUrl,
      responseStatus: response?.status() ?? null,
      responseOk: response?.ok() ?? null,
      contentType: response?.headers()['content-type'] ?? '',
      checkedAt: new Date().toISOString(),
      title: metadata.title,
      description: metadata.description,
      dimensions: {
        width: metadata.width,
        height: metadata.height
      },
      htmlBytes: Buffer.byteLength(html, 'utf8'),
      htmlPreview: html.slice(0, 2000),
      bodyTextPreview: metadata.bodyTextPreview,
      screenshot,
      pdf
    };
  } finally {
    await context.close();
  }
}

async function executeJob(tool, payload) {
  await delay(800);

  if (tool === 'youtube-rank-checker') {
    const keyword = String(payload.keyword || '');
    const videoUrl = String(payload.videoUrl || '');
    if (!keyword || !videoUrl) {
      throw new Error('youtube-rank-checker requires keyword and videoUrl');
    }

    const targetVideoId = extractYouTubeVideoId(videoUrl);
    if (!targetVideoId) {
      throw new Error('youtube-rank-checker requires a valid YouTube videoUrl');
    }

    const checkedAt = new Date().toISOString();
    const targetMetadata = await fetchYouTubeVideoMetadata(videoUrl);

    try {
      const evidence = await fetchYouTubeSearchEvidence(keyword, targetVideoId);
      const rankIndex = evidence.results.findIndex((result) => result.videoId === targetVideoId);
      const rank = rankIndex >= 0 ? rankIndex + 1 : null;
      const matchedResult = rankIndex >= 0 ? evidence.results[rankIndex] : null;
      const attemptedStrategies = evidence.attempts.map((attempt) => attempt.strategy);

      return {
        execution: {
          mode: 'provider',
          readyForPublicLaunch: false,
          notes:
            rank !== null
              ? 'Uses multi-strategy public YouTube search evidence parsing with provenance. Useful for internal evidence gathering, but still not hardened enough for unrestricted public launch.'
              : 'Uses multi-strategy public YouTube search evidence parsing with provenance, but the target video was not found in the parsed result window. Keep internal-only until the evidence path is more robust.',
          provenance: {
            provider: 'youtube-public-search',
            strategy: evidence.strategy,
            attemptedStrategies,
            attemptCount: evidence.attempts.length,
            degraded: false
          }
        },
        result: {
          keyword,
          videoUrl,
          targetVideoId,
          estimatedRank: rank,
          foundInTopResults: rank !== null,
          scannedCount: evidence.results.length,
          checkedAt,
          method: 'youtube-search-html',
          strategyUsed: evidence.strategy,
          searchUrl: evidence.searchUrl,
          matchedResult,
          targetMetadata,
          attempts: evidence.attempts
        },
        artifacts: [
          {
            id: 'youtube-rank-report',
            type: 'report',
            title: 'YouTube rank checker report',
            content: {
              summary:
                rank !== null
                  ? `Video ranked #${rank} for keyword "${keyword}" using ${evidence.strategy}.`
                  : `Video not found in the first ${evidence.results.length} parsed YouTube search results for keyword "${keyword}" after ${evidence.attempts.length} strategy attempts.`,
              inputs: { keyword, videoUrl, targetVideoId },
              targetMetadata,
              searchUrl: evidence.searchUrl,
              strategyUsed: evidence.strategy,
              attempts: evidence.attempts,
              matchedResult,
              parsedResults: evidence.results,
              generatedAt: checkedAt
            }
          }
        ]
      };
    } catch (error) {
      const fallbackRank = pseudoRank(keyword, videoUrl);
      const errorMessage = error instanceof Error ? error.message : 'Unknown search execution failure';

      return {
        execution: {
          mode: 'simulated',
          readyForPublicLaunch: false,
          notes: `Live YouTube search evidence could not be collected after multi-strategy attempts; fell back to deterministic simulation. Reason: ${errorMessage}`,
          provenance: {
            provider: 'youtube-public-search',
            strategy: 'deterministic-simulation-fallback',
            attemptedStrategies: [
              'desktop-initial-data',
              'desktop-regex-fallback',
              'mobile-anchor-fallback'
            ],
            attemptCount: 3,
            degraded: true
          }
        },
        result: {
          keyword,
          videoUrl,
          targetVideoId,
          estimatedRank: fallbackRank,
          foundInTopResults: null,
          scannedCount: 0,
          checkedAt,
          method: 'deterministic-simulation-fallback',
          degraded: true,
          targetMetadata
        },
        artifacts: [
          {
            id: 'youtube-rank-report',
            type: 'report',
            title: 'YouTube rank checker report',
            content: {
              summary: `Live search evidence was unavailable, so a deterministic fallback rank of #${fallbackRank} was produced for keyword "${keyword}".`,
              inputs: { keyword, videoUrl, targetVideoId },
              targetMetadata,
              degraded: true,
              fallbackReason: errorMessage,
              generatedAt: checkedAt
            }
          }
        ]
      };
    }
  }

  if (tool === 'snapify-capture-screenshot-save-pdf') {
    const urls = Array.isArray(payload.urls) ? payload.urls.map(String).filter(Boolean) : [];
    if (!urls.length) {
      throw new Error('snapify-capture-screenshot-save-pdf requires one or more urls');
    }

    let browser = null;
    let browserLaunchError = null;
    try {
      browser = await launchRenderingBrowser();
    } catch (error) {
      browserLaunchError = error instanceof Error ? error.message : 'Unknown browser launch failure';
    }

    const artifacts = [];
    const captures = [];

    try {
      for (const [index, url] of urls.entries()) {
        const captureId = String(index + 1);

        if (browser) {
          try {
            const rendered = await renderPageArtifacts(browser, url);
            const screenshotArtifactId = `screenshot-${captureId}`;
            const pdfArtifactId = `pdf-${captureId}`;

            artifacts.push(
              {
                id: screenshotArtifactId,
                type: 'screenshot',
                title: `Rendered screenshot for ${url}`,
                content: toBase64Artifact(
                  rendered.screenshot,
                  'image/png',
                  `snapify-${captureId}.png`,
                  {
                    url,
                    finalUrl: rendered.finalUrl,
                    generatedAt: rendered.checkedAt
                  }
                )
              },
              {
                id: pdfArtifactId,
                type: 'pdf',
                title: `Rendered PDF for ${url}`,
                content: toBase64Artifact(
                  rendered.pdf,
                  'application/pdf',
                  `snapify-${captureId}.pdf`,
                  {
                    url,
                    finalUrl: rendered.finalUrl,
                    generatedAt: rendered.checkedAt
                  }
                )
              },
              {
                id: `page-evidence-${captureId}`,
                type: 'report',
                title: `Rendered page evidence for ${url}`,
                content: {
                  url,
                  success: true,
                  renderedArtifactsAvailable: true,
                  artifacts: {
                    screenshotId: screenshotArtifactId,
                    pdfId: pdfArtifactId
                  },
                  evidence: {
                    requestedUrl: url,
                    finalUrl: rendered.finalUrl,
                    ok: rendered.responseOk,
                    status: rendered.responseStatus,
                    title: rendered.title,
                    description: rendered.description,
                    contentType: rendered.contentType,
                    htmlBytes: rendered.htmlBytes,
                    htmlPreview: rendered.htmlPreview,
                    bodyTextPreview: rendered.bodyTextPreview,
                    dimensions: rendered.dimensions,
                    checkedAt: rendered.checkedAt
                  }
                }
              }
            );

            captures.push({
              url,
              success: true,
              renderMode: 'browser',
              renderedArtifactsAvailable: true,
              artifacts: {
                screenshotId: screenshotArtifactId,
                pdfId: pdfArtifactId
              },
              evidence: {
                requestedUrl: url,
                finalUrl: rendered.finalUrl,
                ok: rendered.responseOk,
                status: rendered.responseStatus,
                title: rendered.title,
                description: rendered.description,
                contentType: rendered.contentType,
                htmlBytes: rendered.htmlBytes,
                htmlPreview: rendered.htmlPreview,
                bodyTextPreview: rendered.bodyTextPreview,
                dimensions: rendered.dimensions,
                checkedAt: rendered.checkedAt
              }
            });
            continue;
          } catch (error) {
            const renderError = error instanceof Error ? error.message : 'Unknown browser capture failure';

            try {
              const evidence = await fetchPageEvidence(url);
              artifacts.push({
                id: `page-evidence-${captureId}`,
                type: 'report',
                title: `Fallback page evidence for ${url}`,
                content: {
                  url,
                  success: true,
                  fallbackUsed: true,
                  renderError,
                  renderedArtifactsAvailable: false,
                  evidence
                }
              });

              captures.push({
                url,
                success: true,
                fallbackUsed: true,
                renderMode: 'html-evidence-only',
                renderedArtifactsAvailable: false,
                renderError,
                evidence
              });
              continue;
            } catch (fallbackError) {
              captures.push({
                url,
                success: false,
                renderMode: 'failed',
                renderedArtifactsAvailable: false,
                error: fallbackError instanceof Error ? fallbackError.message : 'Unknown capture failure',
                renderError
              });
              continue;
            }
          }
        }

        try {
          const evidence = await fetchPageEvidence(url);
          artifacts.push({
            id: `page-evidence-${captureId}`,
            type: 'report',
            title: `Page evidence for ${url}`,
            content: {
              url,
              success: true,
              fallbackUsed: true,
              renderError: browserLaunchError,
              renderedArtifactsAvailable: false,
              evidence
            }
          });

          captures.push({
            url,
            success: true,
            fallbackUsed: true,
            renderMode: 'html-evidence-only',
            renderedArtifactsAvailable: false,
            renderError: browserLaunchError,
            evidence
          });
        } catch (error) {
          captures.push({
            url,
            success: false,
            renderMode: 'failed',
            renderedArtifactsAvailable: false,
            error: error instanceof Error ? error.message : 'Unknown capture failure',
            renderError: browserLaunchError
          });
        }
      }
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    const renderedArtifactsAvailable = captures.some((capture) => capture.renderedArtifactsAvailable);
    const usedFallback = captures.some((capture) => capture.fallbackUsed);

    return {
      execution: {
        mode: browser ? 'browser' : 'provider',
        readyForPublicLaunch: renderedArtifactsAvailable,
        notes:
          renderedArtifactsAvailable
            ? 'Renders real screenshots and PDFs in a browser worker with public-host validation at the gateway, single-URL capture, authenticated access, retention TTLs, and artifact/dimension budgets. Suitable for authenticated beta use outside the free-tier subset.'
            : `Browser rendering was unavailable, so the worker fell back to live HTML evidence capture only. Reason: ${browserLaunchError || 'unknown browser launch issue'}`
      },
      result: {
        captureCount: captures.length,
        renderedArtifactsAvailable,
        captureMode: renderedArtifactsAvailable
          ? (usedFallback ? 'browser-rendered-with-fallback' : 'browser-rendered')
          : 'html-evidence-only',
        browserRuntimeAvailable: Boolean(browser),
        captures
      },
      artifacts
    };
  }

  if (tool === 'traffic-booster') {
    const urls = Array.isArray(payload.urls) ? payload.urls.map(String).filter(Boolean) : [];
    if (!urls.length) {
      throw new Error('traffic-booster requires one or more urls');
    }

    const projections = urls.map((url, index) => ({
      url,
      expectedSessions: 150 + index * 35,
      conversionLiftPct: 1.5 + index * 0.4,
      windowDays: 7
    }));

    return {
      execution: {
        mode: 'projection',
        readyForPublicLaunch: false,
        notes: 'Returns projection-style planning output only and should remain disabled for public launch.'
      },
      result: {
        runId: `traffic_${Date.now().toString(36)}`,
        projections
      },
      artifacts: [
        {
          id: 'traffic-plan',
          type: 'json',
          title: 'Traffic booster execution plan',
          content: {
            generatedAt: new Date().toISOString(),
            projections
          }
        }
      ]
    };
  }

  throw new Error(`No worker implementation for tool: ${tool}`);
}

app.get('/', (_req, res) => {
  res.json({
    service: 'scraper-service',
    status: 'ok',
    runtime: 'job-executor',
    time: new Date().toISOString()
  });
});

app.post('/jobs/execute', async (req, res) => {
  const { jobId, tool, payload } = req.body || {};

  if (!jobId || !tool || typeof payload !== 'object' || payload === null) {
    return res.status(400).json({
      error: {
        code: 'invalid_request',
        message: 'jobId, tool, and payload are required'
      }
    });
  }

  try {
    const execution = await executeJob(tool, payload);
    return res.json(execution);
  } catch (error) {
    return res.status(422).json({
      error: {
        code: 'job_execution_failed',
        message: error instanceof Error ? error.message : 'Unknown execution error'
      }
    });
  }
});

app.listen(port, () => {
  console.log(`Scraper Service listening on port ${port}`);
});
