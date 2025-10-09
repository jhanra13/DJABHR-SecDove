import express from 'express';
import { run, get } from '../config/database.js';
import { hashPassword, verifyPassword, generateToken } from '../utils/auth.js';
import { authenticateToken } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// POST /api/auth/register - Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, password, public_key, salt, encrypted_private_key } = req.body;

    // Validate required fields
    if (!username || !password || !public_key || !salt || !encrypted_private_key) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate username format (alphanumeric, underscore, hyphen, 3-20 chars)
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
      return res.status(400).json({ 
        error: 'Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens' 
      });
    }

    // Check if username already exists
    const existingUser = await get('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Insert user into database
    const result = await run(
      `INSERT INTO users (username, password_hash, public_key, salt, encrypted_private_key, created_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, password_hash, public_key, salt, encrypted_private_key, Date.now()]
    );

    // Generate JWT token
    const token = generateToken(result.id, username);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: result.id,
        username,
        public_key,
        salt,
        encrypted_private_key
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login - User login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('Login attempt:', { username, hasPassword: !!password });

    // Validate required fields
    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user by username
    const user = await get(
      'SELECT id, username, password_hash, public_key, salt, encrypted_private_key FROM users WHERE username = ?',
      [username]
    );

    if (!user) {
      console.log('User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('User found:', user.username);

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      console.log('Invalid password for user:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('Login successful for user:', username);

    // Generate JWT token
    const token = generateToken(user.id, user.username);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        public_key: user.public_key,
        salt: user.salt,
        encrypted_private_key: user.encrypted_private_key
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/user - Get current user info
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const user = await get(
      'SELECT id, username, public_key, salt, encrypted_private_key, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout - Logout (client-side token removal)
router.post('/logout', authenticateToken, (req, res) => {
  // With JWT, logout is handled client-side by removing the token
  // This endpoint is mainly for logging purposes
  res.json({ message: 'Logout successful' });
});

// GET /api/auth/check-username/:username - Check if username exists (public route)
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Validate username format
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
      return res.status(400).json({ error: 'Invalid username format' });
    }

    // Check if username exists
    const existingUser = await get('SELECT id FROM users WHERE username = ?', [username]);
    
    res.json({ exists: !!existingUser });
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
