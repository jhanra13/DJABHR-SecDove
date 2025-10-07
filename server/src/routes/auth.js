import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getQuery, allQuery } from '../config/database.js';
import { generateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Register new user
router.post('/register', asyncHandler(async (req, res) => {
  const { username, password, publicKey } = req.body;

  // Validation
  if (!username || !password || !publicKey) {
    return res.status(400).json({ error: 'Username, password, and public key are required' });
  }

  if (username.length < 3 || password.length < 6) {
    return res.status(400).json({ error: 'Username must be at least 3 characters, password at least 6 characters' });
  }

  // Check if user already exists
  const existingUser = await getQuery('SELECT id FROM users WHERE username = ? OR email = ?', [username, username]);
  if (existingUser) {
    return res.status(409).json({ error: 'Username or email already exists' });
  }

  // Hash password
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  // Create user
  const userId = uuidv4();
  const email = username; // For simplicity, use username as email

  await runQuery(
    'INSERT INTO users (id, username, email, password_hash, public_key, salt) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, username, email, passwordHash, publicKey, salt]
  );

  // Generate JWT token
  const token = generateToken(userId);

  // Store session
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await runQuery(
    'INSERT INTO user_sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
    [sessionId, userId, token, expiresAt.toISOString()]
  );

  res.status(201).json({
    message: 'User registered successfully',
    user: {
      id: userId,
      username,
      email
    },
    token
  });
}));

// Login user
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Validation
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // Find user
  const user = await getQuery(
    'SELECT id, username, email, password_hash, public_key FROM users WHERE username = ? OR email = ?',
    [username, username]
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Update last seen
  await runQuery('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

  // Generate JWT token
  const token = generateToken(user.id);

  // Store session (replace any existing session for this user)
  await runQuery('DELETE FROM user_sessions WHERE user_id = ?', [user.id]);

  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await runQuery(
    'INSERT INTO user_sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
    [sessionId, user.id, token, expiresAt.toISOString()]
  );

  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      publicKey: user.public_key
    },
    token
  });
}));

// Logout user
router.post('/logout', asyncHandler(async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    await runQuery('DELETE FROM user_sessions WHERE token = ?', [token]);
  }

  res.json({ message: 'Logout successful' });
}));

// Verify token (for client-side token validation)
router.get('/verify', asyncHandler(async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }

  const session = await getQuery(
    'SELECT u.id, u.username, u.email, u.public_key FROM user_sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime("now")',
    [token]
  );

  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  res.json({
    user: {
      id: session.id,
      username: session.username,
      email: session.email,
      publicKey: session.public_key
    }
  });
}));

export default router;