import { httpServer } from '../server/server.js';

// Vercel Node function entry: delegate to the shared HTTP server (supports Socket.IO long polling)
export default function handler(req, res) {
  return httpServer.emit('request', req, res);
}
