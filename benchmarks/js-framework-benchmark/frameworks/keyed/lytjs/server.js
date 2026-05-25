// Simple HTTP server for LytJS benchmark
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  let filePath = '.' + req.url;
  if (filePath === './') filePath = './index.html';

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
  console.log('🚀 LytJS Benchmark Server');
  console.log('=========================================');
  console.log(`📍 Server running at: http://localhost:${PORT}`);
  console.log('');
  console.log('📋 浏览器操作步骤:');
  console.log('   1. 打开上面的链接');
  console.log('   2. 点击 "🔬 测量所有场景" 按钮');
  console.log('   3. 查看性能结果');
  console.log('');
  console.log('⏹️  按 Ctrl+C 停止服务器');
  console.log('=========================================');
});
