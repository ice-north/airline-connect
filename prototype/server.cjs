const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const server = http.createServer((request, response) => {
  const requested = request.url === '/' ? 'index.html' : request.url.split('?')[0].replace(/^\//, '');
  const filePath = path.resolve(root, requested);
  if (!filePath.startsWith(root) || !fs.existsSync(filePath)) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  response.writeHead(200, {
    'Content-Type': filePath.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0'
  });
  response.end(fs.readFileSync(filePath));
});

server.listen(5175, '127.0.0.1', () => console.log('http://127.0.0.1:5175'));
