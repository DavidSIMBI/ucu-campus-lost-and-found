import { createReadStream, promises as fs } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST_DIRECTORY = fileURLToPath(new URL('./dist/', import.meta.url));
const PORT = Number(process.env.PORT) || 4173;
const CONTENT_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff2', 'font/woff2']
]);

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

function sendNotFound(response) {
  response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('Not found');
}

const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Invalid URL');
    return;
  }

  let filePath = path.resolve(DIST_DIRECTORY, `.${pathname}`);
  const relativePath = path.relative(DIST_DIRECTORY, filePath);
  if (relativePath.startsWith(`..${path.sep}`) || relativePath === '..' || path.isAbsolute(relativePath)) {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Invalid path');
    return;
  }

  try {
    const fileInfo = await fs.stat(filePath);
    if (fileInfo.isDirectory()) filePath = path.join(filePath, 'index.html');
    await fs.access(filePath);
  } catch {
    if (!request.headers.accept?.includes('text/html')) {
      sendNotFound(response);
      return;
    }
    filePath = path.join(DIST_DIRECTORY, 'index.html');
  }

  try {
    const { size } = await fs.stat(filePath);
    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      'Content-Length': size,
      'Content-Type': CONTENT_TYPES.get(extension) || 'application/octet-stream',
      'Cache-Control': pathname.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    createReadStream(filePath).pipe(response);
  } catch {
    sendNotFound(response);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`UCU Lost and Found frontend listening on port ${PORT}`);
});
