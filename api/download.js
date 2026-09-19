import { Readable } from 'node:stream';

function safeFilename(value) {
  return (value || 'snapdown-video').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
}

function isPrivateHost(hostname) {
  return [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^::1$/,
    /^0\.0\.0\.0$/,
  ].some((p) => p.test(hostname));
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const host = req.headers.host || 'snapdown.online';
  const requestUrl = new URL(req.url, `https://${host}`);
  const target = req.query?.url || requestUrl.searchParams.get('url');

  if (!target) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Missing ?url= parameter.' }));
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      throw new Error('Only HTTP and HTTPS protocols are supported.');
    }
  } catch (error) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: error.message || 'Invalid target URL.' }));
  }

  if (isPrivateHost(targetUrl.hostname)) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Access to private addresses is forbidden.' }));
  }

  const filename = safeFilename(
    req.query?.filename ||
    req.query?.name ||
    requestUrl.searchParams.get('filename') ||
    requestUrl.searchParams.get('name') ||
    'snapdown-media'
  );

  try {
    const upstreamHeaders = {
      Accept: '*/*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 SnapDown',
      Referer: targetUrl.origin + '/',
    };

    if (req.headers.range) {
      upstreamHeaders['Range'] = req.headers.range;
    }

    const upstream = await fetch(targetUrl, {
      redirect: 'follow',
      headers: upstreamHeaders,
    });

    if (!upstream.ok || !upstream.body) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.end(JSON.stringify({ error: `The media server returned ${upstream.status}.` }));
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    res.statusCode = upstream.status === 206 ? 206 : 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    const contentRange = upstream.headers.get('content-range');
    if (contentRange) {
      res.setHeader('Content-Range', contentRange);
    }

    Readable.fromWeb(upstream.body).pipe(res);
  } catch (err) {
    console.error('Download proxy failed:', err);
    if (!res.headersSent) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify({ error: 'Unable to fetch the media file from its source server.' }));
    }
  }
}
