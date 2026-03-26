const http = require('http');
const fs = require('fs');
const path = require('path');

const apiBase = path.join(__dirname, 'apps/api-gateway/app/api/v1');
const routes = [];

function findRoutes(dir, baseRoute = '/api/v1') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      findRoutes(path.join(dir, entry.name), `${baseRoute}/${entry.name}`);
    } else if (entry.name === 'route.ts') {
      routes.push(baseRoute);
    }
  }
}

findRoutes(apiBase);
console.log(`Found ${routes.length} API routes.`);

async function runTests() {
  console.log('Starting QA Loop on port 3001...');
  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const route of routes) {
    try {
      const result = await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:3001${route}`, (res) => {
          let body = '';
          res.on('data', (chunk) => body += chunk);
          res.on('end', () => {
            try {
              const json = JSON.parse(body);
              resolve({ statusCode: res.statusCode, json });
            } catch (e) {
              resolve({ statusCode: res.statusCode, body });
            }
          });
        });
        req.on('error', reject);
      });

      const isJson = result.json !== undefined;
      const hasSuccessField = isJson && typeof result.json.success === 'boolean';

      // Some endpoints might return 500 if the scraper throws an error (e.g. missing param that got scraped, or cheerio fails).
      // That's fine if the envelop correctly captured it: "success": false, "error": "something".
      if (hasSuccessField) {
        passed++;
        console.log(`✅ ${route} (Status: ${result.statusCode})`);
      } else {
        failed++;
        console.log(`❌ ${route} (Status: ${result.statusCode}) - Invalid format`);
        failures.push({ route, status: result.statusCode, response: result.json || result.body });
      }
    } catch (error) {
      failed++;
      console.log(`❌ ${route} - Request failed: ${error.message}`);
      failures.push({ route, error: error.message });
    }
  }

  console.log(`\n--- QA Summary ---`);
  console.log(`Total: ${routes.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log(`\nFailures details:`, JSON.stringify(failures, null, 2));
    process.exit(1);
  } else {
    console.log(`\nAll endpoints follow the new DRY/SOLID response format!`);
    process.exit(0);
  }
}

runTests();
