const DEFAULT_ORIGIN = 'https://secdove-frontend.vercel.app';

export const config = {
  api: {
    bodyParser: false
  }
};

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
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true, timestamp: Date.now() }));
}
