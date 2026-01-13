const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const LOG_FILE = path.join(ROOT_DIR, '1alltrack.log');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const send = (res, statusCode, body, headers = {}) => {
  res.writeHead(statusCode, headers);
  res.end(body);
};

const formatTimestamp = () => new Date().toISOString();

const appendLogLine = (line, callback) => {
  const text = line.endsWith('\n') ? line : `${line}\n`;
  fs.appendFile(LOG_FILE, text, 'utf8', callback);
};

const handleLog = (req, res) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    const trimmed = body.trim();
    const logLine = `${formatTimestamp()} CLIENT_LOG ${trimmed || '[empty]'}`;
    appendLogLine(logLine, (error) => {
      if (error) {
        send(res, 500, 'Ошибка записи лога');
        return;
      }
      send(res, 204, '');
    });
  });
};

const resolveFilePath = (urlPath) => {
  const safePath = decodeURIComponent(urlPath.split('?')[0]);
  const normalized = path.normalize(safePath).replace(/^([/\\])+/, '');
  const target = normalized === '' ? 'index.html' : normalized;
  return path.join(ROOT_DIR, target);
};

const server = http.createServer((req, res) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const url = req.url || '-';
    const method = req.method || '-';
    const status = res.statusCode;
    const logLine = `${formatTimestamp()} REQUEST ${method} ${url} ${status} ${durationMs}ms`;
    appendLogLine(logLine, (error) => {
      if (error) {
        console.error('Ошибка записи лога:', error);
      }
    });
  });

  if (!req.url) {
    send(res, 400, 'Некорректный запрос');
    return;
  }

  if (req.method === 'POST' && req.url.startsWith('/log')) {
    handleLog(req, res);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Метод не поддерживается');
    return;
  }

  const filePath = resolveFilePath(req.url);
  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      send(res, 404, 'Файл не найден');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`AllTrack доступен на http://localhost:${PORT}`);
});
