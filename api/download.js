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

function buildRequestHeaders(targetUrl, req) {
  const range = req.headers.range;
  const common = {
    Accept: '*/*',
    'Accept-Encoding': req.headers['accept-encoding'] || 'identity',
    'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.9',
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
  const source = req.query?.source || requestUrl.searchParams.get('source');
  const formatId = req.query?.formatId || requestUrl.searchParams.get('formatId');

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
    if (targetUrl.hostname.endsWith('googlevideo.com') && source && formatId) {
      const refreshedUrl = await refreshMediaUrl(source, formatId);
      if (refreshedUrl) targetUrl = new URL(refreshedUrl);
    }

    let upstream;
    let lastStatus = 0;
    for (const headers of buildRequestHeaders(targetUrl, req)) {
      upstream = await fetch(targetUrl, { redirect: 'follow', headers });
      lastStatus = upstream.status;
      if (upstream.ok && upstream.body) break;
    }

    if (!upstream || !upstream.ok || !upstream.body) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.end(JSON.stringify({ error: `The media server returned ${lastStatus || upstream?.status || 502}.` }));
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
