import express from 'express';
import { run, get, all } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { normalizeUsername } from '../utils/username.js';

const router = express.Router();

// POST /api/contacts - Add a contact
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { contact_username } = req.body;
    const userId = req.user.userId;
    const currentUsername = normalizeUsername(req.user.username);
    const lookupUsername = normalizeUsername(contact_username);

    // Validate required fields
    if (!lookupUsername) {
      return res.status(400).json({ error: 'Contact username is required' });
    }

    // Check if contact user exists
    const contactUser = await get(
      'SELECT id, username, public_key FROM users WHERE username = ? COLLATE NOCASE',
      [lookupUsername]
    );

    if (!contactUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent adding self as contact
    if (normalizeUsername(contactUser.username) === currentUsername) {
      return res.status(400).json({ error: 'Cannot add yourself as a contact' });
    }

    // Check if contact already exists
    const existingContact = await get(
      'SELECT id FROM contacts WHERE user_id = ? AND contact_user_id = ?',
      [userId, contactUser.id]
    );

    if (existingContact) {
      return res.status(409).json({ error: 'Contact already exists' });
    }

    // Add contact
    const result = await run(
      `INSERT INTO contacts (user_id, contact_user_id, contact_username, added_at) 
       VALUES (?, ?, ?, ?)`,
      [userId, contactUser.id, contactUser.username, Date.now()]
    );

    res.status(201).json({
      message: 'Contact added successfully',
      contact: {
        id: result.id,
        contact_user_id: contactUser.id,
        contact_username: contactUser.username,
        public_key: contactUser.public_key,
        added_at: Date.now()
      }
    });
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/contacts - Get all contacts for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
  const userId = req.user.userId;

    const contacts = await all(
      `SELECT c.id, c.contact_user_id, c.contact_username, c.added_at, u.public_key
       FROM contacts c
       JOIN users u ON c.contact_user_id = u.id
       WHERE c.user_id = ?
       ORDER BY c.contact_username ASC`,
      [userId]
    );

    res.json({ contacts });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/contacts/:contactId - Remove a contact
router.delete('/:contactId', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.params;
    const userId = req.user.userId;

    // Verify contact belongs to user
    const contact = await get(
      'SELECT id FROM contacts WHERE id = ? AND user_id = ?',
      [contactId, userId]
    );

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Delete contact
    await run('DELETE FROM contacts WHERE id = ?', [contactId]);

    res.json({ message: 'Contact removed successfully' });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/contacts/:username/public-key - Get public key for a user
router.get('/:username/public-key', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    const lookupUsername = normalizeUsername(username);

    const user = await get(
      'SELECT id, username, public_key FROM users WHERE username = ? COLLATE NOCASE',
      [lookupUsername]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user_id: user.id,
      username: user.username,
      public_key: user.public_key
    });
  } catch (error) {
    console.error('Get public key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
