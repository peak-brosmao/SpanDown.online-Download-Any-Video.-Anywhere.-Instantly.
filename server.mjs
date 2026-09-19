import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 5173);
const isProduction = process.env.NODE_ENV === 'production';

function safeFilename(value) {
  return (value || 'snapdown-video').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
}

async function proxyDownload(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const target = requestUrl.searchParams.get('url');
  if (!target) {
    response.writeHead(400, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'Missing media URL.' }));
    return;
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
    if (targetUrl.protocol !== 'https:') throw new Error('Only HTTPS media URLs are supported.');
  } catch (error) {
    response.writeHead(400, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: error.message }));
    return;
  }

  try {
    const upstream = await fetch(targetUrl, {
      redirect: 'follow',
      headers: {
        Accept: '*/*',
        'User-Agent': 'Mozilla/5.0 SnapDown downloader',
        Referer: 'https://www.youtube.com/',
      },
    });
    if (!upstream.ok || !upstream.body) throw new Error(`Media server returned ${upstream.status}.`);
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const filename = safeFilename(requestUrl.searchParams.get('filename'));
    const headers = { 'Content-Type': contentType, 'Content-Disposition': `attachment; filename="${filename}"` };
    const length = upstream.headers.get('content-length');
    if (length) headers['Content-Length'] = length;
    response.writeHead(200, headers);
    response.flushHeaders();
    Readable.fromWeb(upstream.body).pipe(response);
  } catch (error) {
    if (!response.headersSent) response.writeHead(502, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: error.message || 'Unable to download media.' }));
  }
}

const vite = await createViteServer({ root, server: { middlewareMode: true }, appType: 'spa' });
const server = createServer(async (request, response) => {
  if (request.url?.startsWith('/api/download')) {
    await proxyDownload(request, response);
    return;
  }
  if (!isProduction) {
    vite.middlewares(request, response, () => {});
    return;
  }
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  const file = pathname === '/' ? '/dist/index.html' : `/dist${pathname}`;
  const resolved = join(root, file);
  if (existsSync(resolved) && extname(resolved)) {
    createReadStream(resolved).pipe(response);
    return;
  }
  createReadStream(join(root, 'dist/index.html')).pipe(response);
});

server.listen(port, () => console.log(`SnapDown running at http://localhost:${port}`));
