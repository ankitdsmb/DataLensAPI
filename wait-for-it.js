const http = require('http');

function check() {
  const req = http.get('http://localhost:3000/api/v1/9gag/downloader', (res) => {
    console.log('Server is up!');
    process.exit(0);
  });
  req.on('error', () => {
    setTimeout(check, 1000);
  });
}

console.log('Waiting for Next.js to start...');
check();
