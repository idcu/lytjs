// Simple HTTP server for LytJS benchmark npm version
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8081;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  let filePath = '.' + req.url;
  if (filePath === './') filePath = './signal.html';

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log('=========================================');
  console.log('🚀 LytJS Benchmark Server (npm version)');
  console.log('=========================================');
  console.log(`📍 Server running at: http://localhost:${PORT}`);
  console.log('');
  console.log('📋 测试页面:');
  console.log(`   - VDOM模式: http://localhost:${PORT}/vdom.html`);
  console.log(`   - Signal模式: http://localhost:${PORT}/signal.html`);
  console.log(`   - Vapor模式: http://localhost:${PORT}/vapor.html`);
  console.log('');
  console.log('⏹️  按 Ctrl+C 停止服务器');
  console.log('=========================================');
});
