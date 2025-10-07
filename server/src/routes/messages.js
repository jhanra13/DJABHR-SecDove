import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getQuery, allQuery } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Get messages with a specific user
router.get('/:userId', authenticateToken, asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  // Verify the other user exists and is a contact (or allow messaging anyone for now)
  const otherUser = await getQuery('SELECT id, username FROM users WHERE id = ?', [userId]);

  if (!otherUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Get messages between current user and the other user
  const messages = await allQuery(`
    SELECT
      m.id,
      m.sender_id,
      m.recipient_id,
      m.encrypted_content,
      m.encrypted_key,
      m.iv,
      m.auth_tag,
      m.sent_at,
      m.delivered_at,
      m.read_at,
      u.username as sender_username
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE (m.sender_id = ? AND m.recipient_id = ?)
       OR (m.sender_id = ? AND m.recipient_id = ?)
    ORDER BY m.sent_at DESC
    LIMIT ? OFFSET ?
  `, [req.user.id, userId, userId, req.user.id, parseInt(limit), parseInt(offset)]);

  // Mark messages as delivered (if sent to current user)
  await runQuery(`
    UPDATE messages
    SET delivered_at = CURRENT_TIMESTAMP
    WHERE recipient_id = ? AND sender_id = ? AND delivered_at IS NULL
  `, [req.user.id, userId]);

  res.json({
    messages: messages.reverse(), // Return in chronological order
    with: {
      id: otherUser.id,
      username: otherUser.username
    }
  });
}));

// Send message
router.post('/send', authenticateToken, asyncHandler(async (req, res) => {
  const { recipientId, encryptedContent, encryptedKey, iv, authTag } = req.body;

  // Validation
  if (!recipientId || !encryptedContent || !encryptedKey || !iv) {
    return res.status(400).json({
      error: 'Recipient ID, encrypted content, encrypted key, and IV are required'
    });
  }

  // Verify recipient exists
  const recipient = await getQuery('SELECT id FROM users WHERE id = ?', [recipientId]);

  if (!recipient) {
    return res.status(404).json({ error: 'Recipient not found' });
  }

  // Don't allow sending messages to self
  if (recipientId === req.user.id) {
    return res.status(400).json({ error: 'Cannot send messages to yourself' });
  }

  // Create message
  const messageId = uuidv4();

  await runQuery(`
    INSERT INTO messages (id, sender_id, recipient_id, encrypted_content, encrypted_key, iv, auth_tag)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [messageId, req.user.id, recipientId, encryptedContent, encryptedKey, iv, authTag || null]);

  res.status(201).json({
    message: 'Message sent successfully',
    messageId
  });
}));

// Mark message as read
router.put('/:messageId/read', authenticateToken, asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  // Verify message exists and belongs to current user
  const message = await getQuery(
    'SELECT id FROM messages WHERE id = ? AND recipient_id = ?',
    [messageId, req.user.id]
  );

  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  await runQuery(
    'UPDATE messages SET read_at = CURRENT_TIMESTAMP WHERE id = ?',
    [messageId]
  );

  res.json({ message: 'Message marked as read' });
}));

// Delete message (soft delete)
router.delete('/:messageId', authenticateToken, asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  // Verify message exists and user can delete it
  const message = await getQuery(`
    SELECT sender_id, recipient_id FROM messages WHERE id = ?
  `, [messageId]);

  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  if (message.sender_id !== req.user.id && message.recipient_id !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized to delete this message' });
  }

  // Soft delete - mark as deleted by this user
  const field = message.sender_id === req.user.id ? 'deleted_by_sender' : 'deleted_by_recipient';

  await runQuery(
    `UPDATE messages SET ${field} = 1 WHERE id = ?`,
    [messageId]
  );

  res.json({ message: 'Message deleted successfully' });
}));

// Get unread message count
router.get('/unread/count', authenticateToken, asyncHandler(async (req, res) => {
  const result = await getQuery(`
    SELECT COUNT(*) as count FROM messages
    WHERE recipient_id = ? AND read_at IS NULL
  `, [req.user.id]);

  res.json({ unreadCount: result.count });
}));

export default router;