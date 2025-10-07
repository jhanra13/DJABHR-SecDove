import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getQuery, allQuery } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Get user's contacts
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const contacts = await allQuery(`
    SELECT
      c.id,
      c.contact_id,
      u.username as contact_username,
      u.email as contact_email,
      u.public_key,
      u.last_seen,
      c.nickname,
      c.is_blocked,
      c.created_at
    FROM contacts c
    JOIN users u ON c.contact_id = u.id
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
  `, [req.user.id]);

  res.json({ contacts });
}));

// Add contact
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  // Find user by username
  const contactUser = await getQuery('SELECT id FROM users WHERE username = ?', [username]);

  if (!contactUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (contactUser.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot add yourself as a contact' });
  }

  // Check if contact already exists
  const existingContact = await getQuery(
    'SELECT id FROM contacts WHERE user_id = ? AND contact_id = ?',
    [req.user.id, contactUser.id]
  );

  if (existingContact) {
    return res.status(409).json({ error: 'Contact already exists' });
  }

  // Add contact
  const contactId = uuidv4();
  await runQuery(
    'INSERT INTO contacts (id, user_id, contact_id) VALUES (?, ?, ?)',
    [contactId, req.user.id, contactUser.id]
  );

  res.status(201).json({
    message: 'Contact added successfully',
    contact: {
      id: contactId,
      contact_id: contactUser.id,
      contact_username: username
    }
  });
}));

// Update contact (nickname)
router.put('/:contactId', authenticateToken, asyncHandler(async (req, res) => {
  const { contactId } = req.params;
  const { nickname } = req.body;

  // Verify contact exists and belongs to user
  const contact = await getQuery(
    'SELECT id FROM contacts WHERE id = ? AND user_id = ?',
    [contactId, req.user.id]
  );

  if (!contact) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  await runQuery(
    'UPDATE contacts SET nickname = ? WHERE id = ?',
    [nickname || null, contactId]
  );

  res.json({ message: 'Contact updated successfully' });
}));

// Remove contact
router.delete('/:contactId', authenticateToken, asyncHandler(async (req, res) => {
  const { contactId } = req.params;

  // Verify contact exists and belongs to user
  const contact = await getQuery(
    'SELECT id FROM contacts WHERE id = ? AND user_id = ?',
    [contactId, req.user.id]
  );

  if (!contact) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  await runQuery('DELETE FROM contacts WHERE id = ?', [contactId]);

  res.json({ message: 'Contact removed successfully' });
}));

// Block/unblock contact
router.patch('/:contactId/block', authenticateToken, asyncHandler(async (req, res) => {
  const { contactId } = req.params;
  const { blocked } = req.body;

  // Verify contact exists and belongs to user
  const contact = await getQuery(
    'SELECT id FROM contacts WHERE id = ? AND user_id = ?',
    [contactId, req.user.id]
  );

  if (!contact) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  await runQuery(
    'UPDATE contacts SET is_blocked = ? WHERE id = ?',
    [blocked ? 1 : 0, contactId]
  );

  res.json({
    message: `Contact ${blocked ? 'blocked' : 'unblocked'} successfully`
  });
}));

export default router;