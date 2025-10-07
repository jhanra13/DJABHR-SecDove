import jwt from 'jsonwebtoken';
import { getQuery } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    try {
      // Verify token exists in database and hasn't been revoked
      const session = await getQuery(
        'SELECT * FROM user_sessions WHERE token = ? AND expires_at > datetime("now")',
        [token]
      );

      if (!session) {
        return res.status(403).json({ error: 'Session expired or invalid' });
      }

      // Get user details
      const user = await getQuery(
        'SELECT id, username, email, public_key, last_seen FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      req.user = user;
      req.token = token;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({ error: 'Authentication error' });
    }
  });
}

export function generateToken(userId) {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: '7d' } // 7 days
  );
}

export function generateRefreshToken(userId) {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '30d' } // 30 days
  );
}