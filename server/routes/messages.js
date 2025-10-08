import express from 'express';
import { run, get, all } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/messages - Send a new message
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { conversation_id, content_key_number, encrypted_msg_content } = req.body;
    const username = req.user.username;

    // Validate required fields
    if (!conversation_id || content_key_number === undefined || !encrypted_msg_content) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Verify user is part of the conversation
    const userInConversation = await get(
      'SELECT id FROM conversations WHERE id = ? AND username = ?',
      [conversation_id, username]
    );

    if (!userInConversation) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // Insert message
    const timestamp = Date.now();
    const result = await run(
      `INSERT INTO messages (conversation_id, content_key_number, encrypted_msg_content, sender_username, created_at, is_deleted)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [conversation_id, content_key_number, encrypted_msg_content, username, timestamp]
    );

    const messageData = {
      id: result.id,
      conversation_id,
      content_key_number,
      encrypted_msg_content,
      sender_username: username,
      created_at: timestamp,
      is_deleted: 0
    };

    // Emit real-time message to all participants in the conversation
    const io = req.app.get('io');
    console.log('📡 IO instance available:', !!io);
    
    if (io) {
      const roomName = `conversation:${conversation_id}`;
      console.log('📨 Emitting new-message to room:', roomName);
      console.log('📦 Message data:', { id: messageData.id, conversation_id });
      
      // Get all sockets in this room
      const room = io.sockets.adapter.rooms.get(roomName);
      console.log('👥 Clients in room:', room ? room.size : 0);
      
      io.to(roomName).emit('new-message', messageData);
      console.log('✅ Emitted new-message event');
    } else {
      console.error('❌ IO instance not available!');
    }

    res.status(201).json({
      message: 'Message sent successfully',
      messageData
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/messages/:conversationId - Get all messages for a conversation
router.get('/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const username = req.user.username;
    const { limit = 50, offset = 0 } = req.query;

    // Verify user is part of the conversation
    const userInConversation = await get(
      'SELECT id FROM conversations WHERE id = ? AND username = ?',
      [conversationId, username]
    );

    if (!userInConversation) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // Get messages (excluding deleted ones)
    const messages = await all(
      `SELECT id, conversation_id, content_key_number, encrypted_msg_content, sender_username, created_at, updated_at, is_deleted
       FROM messages
       WHERE conversation_id = ? AND is_deleted = 0
       ORDER BY created_at ASC
       LIMIT ? OFFSET ?`,
      [conversationId, parseInt(limit, 10), parseInt(offset, 10)]
    );

    // Get total count
    const countResult = await get(
      'SELECT COUNT(*) as total FROM messages WHERE conversation_id = ? AND is_deleted = 0',
      [conversationId]
    );

    res.json({
      messages,
      pagination: {
        total: countResult.total,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/messages/:messageId - Update (edit) a message
router.put('/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { encrypted_msg_content } = req.body;
    const username = req.user.username;

    // Validate required fields
    if (!encrypted_msg_content) {
      return res.status(400).json({ error: 'Encrypted message content is required' });
    }

    // Get message and verify it exists
    const message = await get(
      'SELECT id, conversation_id, sender_username, content_key_number FROM messages WHERE id = ?',
      [messageId]
    );

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.sender_username && message.sender_username !== username) {
      return res.status(403).json({ error: 'Not allowed to modify this message' });
    }

    // Verify user is part of the conversation
    const userInConversation = await get(
      'SELECT id FROM conversations WHERE id = ? AND username = ?',
      [message.conversation_id, username]
    );

    if (!userInConversation) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update message
    const timestamp = Date.now();
    await run(
      'UPDATE messages SET encrypted_msg_content = ?, updated_at = ? WHERE id = ?',
      [encrypted_msg_content, timestamp, messageId]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${message.conversation_id}`).emit('message-updated', {
        id: parseInt(messageId, 10),
        conversation_id: message.conversation_id,
        content_key_number: message.content_key_number,
        encrypted_msg_content,
        updated_at: timestamp
      });
    }

    res.json({
      message: 'Message updated successfully',
      messageData: {
        id: parseInt(messageId),
        encrypted_msg_content,
        updated_at: timestamp
      }
    });
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/messages/:messageId - Delete a message (soft delete)
router.delete('/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const username = req.user.username;

    // Get message and verify it exists
    const message = await get(
      'SELECT id, conversation_id, sender_username FROM messages WHERE id = ?',
      [messageId]
    );

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.sender_username && message.sender_username !== username) {
      return res.status(403).json({ error: 'Not allowed to delete this message' });
    }

    // Verify user is part of the conversation
    const userInConversation = await get(
      'SELECT id FROM conversations WHERE id = ? AND username = ?',
      [message.conversation_id, username]
    );

    if (!userInConversation) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Soft delete message
    await run(
      'UPDATE messages SET is_deleted = 1 WHERE id = ?',
      [messageId]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${message.conversation_id}`).emit('message-deleted', {
        id: parseInt(messageId, 10),
        conversation_id: message.conversation_id
      });
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/messages/recent - Get recent messages across all conversations
router.get('/recent/all', authenticateToken, async (req, res) => {
  try {
    const username = req.user.username;
    const { limit = 20 } = req.query;

    // Get user's conversation IDs
    const userConversations = await all(
      'SELECT DISTINCT id FROM conversations WHERE username = ?',
      [username]
    );

    if (userConversations.length === 0) {
      return res.json({ messages: [] });
    }

    const conversationIds = userConversations.map(c => c.id);
    const placeholders = conversationIds.map(() => '?').join(',');

    // Get recent messages from all user's conversations
    const messages = await all(
      `SELECT id, conversation_id, content_key_number, encrypted_msg_content, created_at, updated_at
       FROM messages
       WHERE conversation_id IN (${placeholders}) AND is_deleted = 0
       ORDER BY created_at DESC
       LIMIT ?`,
      [...conversationIds, parseInt(limit)]
    );

    res.json({ messages });
  } catch (error) {
    console.error('Get recent messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
