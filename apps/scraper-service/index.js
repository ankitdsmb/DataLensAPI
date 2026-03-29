const express = require('express');
const { existsSync } = require('node:fs');
const { chromium } = require('playwright');

const app = express();
const port = process.env.PORT || 3000;
const DEFAULT_PLAYWRIGHT_BROWSERS_PATH = '/tmp/pw-cache/ms-playwright';

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

async function fetchYouTubeSearchEvidence(keyword) {
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`;
  const response = await fetch(searchUrl, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'accept-language': 'en-US,en;q=0.9'
    }
  });

  if (!response.ok) {
    throw new Error(`youtube search request failed with status ${response.status}`);
  }

  const html = await response.text();
  const results = [];
  const seen = new Set();
  const regex = /"videoRenderer":\{"videoId":"([^"]+)".{0,400}?"title":\{"runs":\[\{"text":"([^"]+)"/g;
  let match;

  while ((match = regex.exec(html)) && results.length < 25) {
    const videoId = match[1];
    if (!videoId || seen.has(videoId)) {
      continue;
    }

    seen.add(videoId);
    results.push({
      videoId,
      title: decodeHtmlEntities(match[2]),
      url: `https://www.youtube.com/watch?v=${videoId}`
    });
  }

  if (!results.length) {
    throw new Error('youtube search page did not expose parseable video results');
  }

  return { searchUrl, results };
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

    try {
      const evidence = await fetchYouTubeSearchEvidence(keyword);
      const rankIndex = evidence.results.findIndex((result) => result.videoId === targetVideoId);
      const rank = rankIndex >= 0 ? rankIndex + 1 : null;

      return {
        execution: {
          mode: 'provider',
          readyForPublicLaunch: false,
          notes:
            'Uses lightweight public YouTube search HTML parsing. Useful for evidence gathering, but still not hardened enough for unrestricted public launch.'
        },
        result: {
          keyword,
          videoUrl,
          targetVideoId,
          estimatedRank: rank,
          foundInTopResults: rank !== null,
          scannedCount: evidence.results.length,
          checkedAt,
          method: 'youtube-search-html'
        },
        artifacts: [
          {
            id: 'youtube-rank-report',
            type: 'report',
            title: 'YouTube rank checker report',
            content: {
              summary:
                rank !== null
                  ? `Video ranked #${rank} for keyword "${keyword}" in parsed YouTube search results.`
                  : `Video not found in the first ${evidence.results.length} parsed YouTube search results for keyword "${keyword}".`,
              inputs: { keyword, videoUrl, targetVideoId },
              searchUrl: evidence.searchUrl,
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
          notes: `Live YouTube search evidence could not be collected; fell back to deterministic simulation. Reason: ${errorMessage}`
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
          degraded: true
        },
        artifacts: [
          {
            id: 'youtube-rank-report',
            type: 'report',
            title: 'YouTube rank checker report',
            content: {
              summary: `Live search evidence was unavailable, so a deterministic fallback rank of #${fallbackRank} was produced for keyword "${keyword}".`,
              inputs: { keyword, videoUrl, targetVideoId },
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
        readyForPublicLaunch: false,
        notes:
          renderedArtifactsAvailable
            ? 'Renders real screenshots and PDFs in an internal browser worker. Keep internal-only until browser execution limits, artifact retention, and stronger public safeguards are finalized.'
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
