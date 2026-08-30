import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? '.');
const port = Number(process.argv[3] ?? 8080);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.yaml': 'application/yaml; charset=utf-8',
  '.yml': 'application/yaml; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  try {
    const requestPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let filePath = path.resolve(root, `.${requestPath}`);

    if (!filePath.startsWith(root)) {
      res.writeHead(403).end('Доступ запрещён');
      return;
    }

    let fileStat;
    try {
      fileStat = await stat(filePath);
    } catch {
      res.writeHead(404).end('Не найдено');
      return;
    }

    if (fileStat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const body = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': mime[path.extname(filePath)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(body);
  } catch (error) {
    res.writeHead(500).end(String(error));
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Раздаётся ${root} по адресу http://localhost:${port}`);
});
