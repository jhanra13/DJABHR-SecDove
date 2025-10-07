import express from 'express';
import { getQuery, allQuery } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const user = await getQuery(
    'SELECT id, username, email, public_key, created_at, last_seen FROM users WHERE id = ?',
    [req.user.id]
  );

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
}));

// Search users
router.get('/search', authenticateToken, asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }

  const users = await allQuery(
    'SELECT id, username, email FROM users WHERE username LIKE ? AND id != ? LIMIT 20',
    [`%${q}%`, req.user.id]
  );

  res.json({ users });
}));

// Get user public key
router.get('/:userId/public-key', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await getQuery('SELECT public_key FROM users WHERE id = ?', [userId]);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ publicKey: user.public_key });
}));

// Get user by ID
router.get('/:userId', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await getQuery(
    'SELECT id, username, email, last_seen FROM users WHERE id = ?',
    [userId]
  );

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
}));

export default router;