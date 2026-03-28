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

function toHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return 'invalid-url';
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

    const rank = pseudoRank(keyword, videoUrl);
    return {
      execution: {
        mode: 'simulated',
        readyForPublicLaunch: false,
        notes: 'Returns deterministic simulated rank output; no provider-grade rank collection is performed.'
      },
      result: {
        keyword,
        videoUrl,
        estimatedRank: rank,
        checkedAt: new Date().toISOString(),
        method: 'deterministic-simulation'
      },
      artifacts: [
        {
          id: 'youtube-rank-report',
          type: 'report',
          title: 'YouTube rank checker report',
          content: {
            summary: `Video ranked #${rank} for keyword \"${keyword}\"`,
            inputs: { keyword, videoUrl },
            generatedAt: new Date().toISOString()
          }
        }
      ]
    };
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
