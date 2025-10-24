const DEFAULT_ORIGIN = 'https://secdove-frontend.vercel.app';

function applyCors(req, res) {
  const origin = req.headers.origin || DEFAULT_ORIGIN;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  const requested = req.headers['access-control-request-headers'];
  res.setHeader('Access-Control-Allow-Headers', requested || 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
}

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Rewrite the request URL so Socket.IO sees the expected path
  const originalUrl = req.url || '';
  if (originalUrl.startsWith('/api/socket.io')) {
    req.url = `/socket.io${originalUrl.slice('/api/socket.io'.length)}` || '/socket.io';
  }

  try {
    const mod = await import('../server/server.js');
    const { httpServer } = mod;
    return httpServer.emit('request', req, res);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Server unavailable', hint: 'Ensure DB_PATH or ALLOW_EPHEMERAL_DB is set on the backend', details: e?.message }));
  }
}
