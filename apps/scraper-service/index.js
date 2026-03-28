const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

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

    const captures = urls.map((url, index) => ({
      url,
      screenshotFile: `${toHostname(url)}-${index + 1}.png`,
      pdfFile: `${toHostname(url)}-${index + 1}.pdf`,
      capturedAt: new Date().toISOString()
    }));

    return {
      execution: {
        mode: 'simulated',
        readyForPublicLaunch: false,
        notes: 'Returns synthetic capture artifact records; no rendered screenshot or PDF binaries are produced.'
      },
      result: {
        captureCount: captures.length,
        captures
      },
      artifacts: captures.flatMap((capture, index) => [
        {
          id: `screenshot-${index + 1}`,
          type: 'screenshot',
          title: `Screenshot for ${capture.url}`,
          content: capture
        },
        {
          id: `pdf-${index + 1}`,
          type: 'pdf',
          title: `PDF for ${capture.url}`,
          content: capture
        }
      ])
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
