const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Collect all API routes
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

// Start the Next.js server
const server = spawn('npm', ['run', 'start', '--workspace=apps/api-gateway'], {
  stdio: 'pipe',
  shell: true
});

let serverReady = false;

server.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('Ready in') || output.includes('started server on') || output.includes('Listening on port')) {
    if (!serverReady) {
      serverReady = true;
      runTests();
    }
  }
});

server.stderr.on('data', (data) => {
  console.error(`Next.js Error: ${data.toString()}`);
});

server.on('close', (code) => {
  console.log(`Next.js server exited with code ${code}`);
});

async function runTests() {
  console.log('Starting QA Loop...');
  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const route of routes) {
    try {
      const result = await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:3000${route}`, (res) => {
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

      // We expect a valid JSON response with a "success" field
      // Status should be 200 or 400 (if query params are missing), but not 500
      if (result.statusCode !== 500 && result.json && typeof result.json.success === 'boolean') {
        passed++;
        console.log(`✅ ${route} (Status: ${result.statusCode})`);
      } else {
        failed++;
        console.log(`❌ ${route} (Status: ${result.statusCode}) - Invalid response:`, result.json || result.body);
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
    process.exitCode = 1;
  } else {
    console.log(`\nAll endpoints follow the new DRY/SOLID response format!`);
  }

  // Kill the server
  server.kill('SIGINT');
}

// Timeout failsafe
setTimeout(() => {
  if (!serverReady) {
    console.error('Server failed to start within 30 seconds.');
    server.kill();
    process.exit(1);
  }
}, 30000);
