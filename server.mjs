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

function buildRequestHeaders(targetUrl, request) {
  const range = request.headers.range;
  const common = {
    Accept: '*/*',
    'Accept-Encoding': request.headers['accept-encoding'] || 'identity',
    'Accept-Language': request.headers['accept-language'] || 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    ...(range ? { Range: range } : {}),
  };

  const isGoogleVideo = targetUrl.hostname.endsWith('googlevideo.com');
  const defaultReferer = isGoogleVideo ? 'https://www.youtube.com/' : `${targetUrl.origin}/`;

  return [
    {
      ...common,
      Referer: defaultReferer,
      Origin: isGoogleVideo ? 'https://www.youtube.com' : undefined,
    },
    {
      ...common,
      Referer: 'https://www.youtube.com/',
      Origin: 'https://www.youtube.com',
    },
    {
      ...common,
      Referer: defaultReferer,
    },
    common,
  ].map((headers) => Object.fromEntries(Object.entries(headers).filter(([, value]) => value != null && value !== '')));
}

async function refreshMediaUrl(source, formatId) {
  if (!source || formatId == null) return null;
  const response = await fetch(`https://r-gengpt-api.vercel.app/api/video/download?url=${encodeURIComponent(source)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return null;
  const payload = await response.json();
  const formats = payload?.data?.medias || payload?.medias || payload?.data?.formats || payload?.formats || [];
  return formats.find((item) => String(item?.formatId) === String(formatId))?.url || null;
}

async function proxyDownload(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const target = requestUrl.searchParams.get('url');
  const source = requestUrl.searchParams.get('source');
  const formatId = requestUrl.searchParams.get('formatId');
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
    if (targetUrl.hostname.endsWith('googlevideo.com') && source && formatId) {
      const refreshedUrl = await refreshMediaUrl(source, formatId);
      if (refreshedUrl) targetUrl = new URL(refreshedUrl);
    }

    let upstream;
    let lastStatus = 0;
    for (const headers of buildRequestHeaders(targetUrl, request)) {
      upstream = await fetch(targetUrl, { redirect: 'follow', headers });
      lastStatus = upstream.status;
      if (upstream.ok && upstream.body) break;
    }

    if (!upstream || !upstream.ok || !upstream.body) {
      response.writeHead(502, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: `The media server returned ${lastStatus || upstream?.status || 502}.` }));
      return;
    }
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const filename = safeFilename(requestUrl.searchParams.get('filename'));
    const headers = { 'Content-Type': contentType, 'Content-Disposition': `attachment; filename="${filename}"` };
    const length = upstream.headers.get('content-length');
    if (length) headers['Content-Length'] = length;
    response.writeHead(200, headers);
    response.flushHeaders();
    Readable.fromWeb(upstream.body).pipe(response);
  } catch (error) {
    console.error('Download proxy failed:', error);
    if (!response.headersSent) {
      response.writeHead(502, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'Unable to fetch the media file from its source server.' }));
    }
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
