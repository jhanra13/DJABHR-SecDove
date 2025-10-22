import app from '../server/server.js';

// Vercel Node function entry: delegate to Express app
export default function handler(req, res) {
  return app(req, res);
}
