const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3005;

const JOBS_DIR = path.resolve(__dirname, '../../.jobs');

function ensureJobsDir() {
  if (!fs.existsSync(JOBS_DIR)) {
    fs.mkdirSync(JOBS_DIR, { recursive: true });
  }
}

function processJobs() {
  ensureJobsDir();
  const files = fs.readdirSync(JOBS_DIR);

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const filePath = path.join(JOBS_DIR, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      if (data.job && data.job.status === 'queued') {
        console.log(`Processing job ${data.job.id}...`);

        data.job.status = 'processing';
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

        setTimeout(() => {
          const latestData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          latestData.job.status = 'completed';
          latestData.job.artifact_urls = [`https://storage.example.com/${latestData.job.id}/result.json`];
          fs.writeFileSync(filePath, JSON.stringify(latestData, null, 2), 'utf-8');
          console.log(`Job ${latestData.job.id} completed.`);
        }, 2000);
      }
    } catch (err) {
      console.error(`Error processing file ${file}:`, err);
    }
  }
}

setInterval(processJobs, 3000);

app.get('/', (req, res) => {
  res.send('Scraper Service Worker is running!');
});

app.listen(port, () => {
  console.log(`Scraper Service Worker listening on port ${port}`);
});
