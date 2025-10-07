import express from 'express';
import { run, get, all } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/conversations - Create a new conversation
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { conversation_entries } = req.body;

    // Validate required fields
    if (!conversation_entries || !Array.isArray(conversation_entries) || conversation_entries.length === 0) {
      return res.status(400).json({ error: 'Conversation entries array is required' });
    }

    // Validate each entry
    const conversationId = conversation_entries[0].id;
    const contentKeyNumber = conversation_entries[0].content_key_number || 1;

    for (const entry of conversation_entries) {
      if (!entry.id || !entry.username || !entry.encrypted_content_key) {
        return res.status(400).json({ error: 'Invalid conversation entry format' });
      }
      if (entry.id !== conversationId) {
        return res.status(400).json({ error: 'All entries must have the same conversation ID' });
      }
    }

    // Verify current user is in the conversation
    const currentUsername = req.user.username;
    const userInConversation = conversation_entries.some(entry => entry.username === currentUsername);
    
    if (!userInConversation) {
      return res.status(403).json({ error: 'User must be a participant in the conversation' });
    }

    // Insert all conversation entries
    const timestamp = Date.now();
    for (const entry of conversation_entries) {
      await run(
        `INSERT INTO conversations (id, content_key_number, username, encrypted_content_key, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [entry.id, contentKeyNumber, entry.username, entry.encrypted_content_key, timestamp]
      );
    }

    res.status(201).json({
      message: 'Conversation created successfully',
      conversation: {
        id: conversationId,
        content_key_number: contentKeyNumber,
        participants: conversation_entries.map(e => e.username),
        created_at: timestamp
      }
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/conversations - Get all conversations for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const username = req.user.username;

    // Get all conversation entries for the user
    const userConversations = await all(
      `SELECT DISTINCT id, content_key_number, encrypted_content_key, created_at
       FROM conversations
       WHERE username = ?
       ORDER BY created_at DESC`,
      [username]
    );

    // For each conversation, get all participants
    const conversationsWithParticipants = await Promise.all(
      userConversations.map(async (conv) => {
        const participants = await all(
          `SELECT username, encrypted_content_key
           FROM conversations
           WHERE id = ? AND content_key_number = ?`,
          [conv.id, conv.content_key_number]
        );

        return {
          id: conv.id,
          content_key_number: conv.content_key_number,
          encrypted_content_key: conv.encrypted_content_key,
          participants: participants.map(p => p.username),
          created_at: conv.created_at
        };
      })
    );

    res.json({ conversations: conversationsWithParticipants });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/conversations/:conversationId - Get specific conversation details
router.get('/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const username = req.user.username;

    // Get user's entry for this conversation
    const userEntry = await get(
      `SELECT id, content_key_number, encrypted_content_key, created_at
       FROM conversations
       WHERE id = ? AND username = ?
       ORDER BY content_key_number DESC
       LIMIT 1`,
      [conversationId, username]
    );

    if (!userEntry) {
      return res.status(404).json({ error: 'Conversation not found or access denied' });
    }

    // Get all participants in this conversation
    const participants = await all(
      `SELECT username, encrypted_content_key
       FROM conversations
       WHERE id = ? AND content_key_number = ?`,
      [conversationId, userEntry.content_key_number]
    );

    res.json({
      conversation: {
        id: userEntry.id,
        content_key_number: userEntry.content_key_number,
        encrypted_content_key: userEntry.encrypted_content_key,
        participants: participants.map(p => p.username),
        created_at: userEntry.created_at
      }
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/conversations/:conversationId - Delete conversation (for current user)
router.delete('/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const username = req.user.username;

    // Verify user is part of the conversation
    const userEntry = await get(
      'SELECT id FROM conversations WHERE id = ? AND username = ?',
      [conversationId, username]
    );

    if (!userEntry) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Delete user's conversation entries
    await run(
      'DELETE FROM conversations WHERE id = ? AND username = ?',
      [conversationId, username]
    );

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
