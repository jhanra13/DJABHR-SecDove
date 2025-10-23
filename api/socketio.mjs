import { httpServer } from '../server/server.js';

export const config = {
  api: {
    bodyParser: false
  }
};

export default function handler(req, res) {
  // Rewrite the request URL so Socket.IO sees the expected path
  const originalUrl = req.url || '';
  if (originalUrl.startsWith('/api/socket.io')) {
    req.url = `/socket.io${originalUrl.slice('/api/socket.io'.length)}` || '/socket.io';
  }

  return httpServer.emit('request', req, res);
}
