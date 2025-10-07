import jwt from 'jsonwebtoken';
import { runQuery, getQuery } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const connectedUsers = new Map(); // userId -> socketId

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Authenticate socket connection
    socket.on('authenticate', async (data) => {
      try {
        const { token } = data;

        if (!token) {
          socket.emit('auth_error', { error: 'Token required' });
          return;
        }

        // Verify JWT token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Verify session is still valid
        const session = await getQuery(
          'SELECT u.id, u.username FROM user_sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime("now")',
          [token]
        );

        if (!session) {
          socket.emit('auth_error', { error: 'Invalid or expired session' });
          return;
        }

        // Store user info in socket
        socket.userId = session.id;
        socket.username = session.username;

        // Track connected user
        connectedUsers.set(session.id, socket.id);

        // Update user's last seen
        await runQuery('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?', [session.id]);

        socket.emit('authenticated', {
          user: {
            id: session.id,
            username: session.username
          }
        });

        console.log(`User ${session.username} authenticated on socket ${socket.id}`);

        // Broadcast user online status
        socket.broadcast.emit('user_online', {
          userId: session.id,
          username: session.username
        });

      } catch (error) {
        console.error('Socket authentication error:', error);
        socket.emit('auth_error', { error: 'Authentication failed' });
      }
    });

    // Handle real-time message sending
    socket.on('message:send', async (data) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { error: 'Not authenticated' });
          return;
        }

        const { recipientId, encryptedContent, encryptedKey, iv, authTag, conversationId } = data;

        if (!recipientId || !encryptedContent || !encryptedKey || !iv) {
          socket.emit('error', { error: 'Missing required message data' });
          return;
        }

        // Verify recipient exists
        const recipient = await getQuery('SELECT id, username FROM users WHERE id = ?', [recipientId]);

        if (!recipient) {
          socket.emit('error', { error: 'Recipient not found' });
          return;
        }

        // Create message in database
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await runQuery(`
          INSERT INTO messages (id, sender_id, recipient_id, encrypted_content, encrypted_key, iv, auth_tag)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [messageId, socket.userId, recipientId, encryptedContent, encryptedKey, iv, authTag || null]);

        // Send to recipient if they're online
        const recipientSocketId = connectedUsers.get(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('message:receive', {
            id: messageId,
            senderId: socket.userId,
            senderUsername: socket.username,
            encryptedContent,
            encryptedKey,
            iv,
            authTag,
            sentAt: new Date().toISOString()
          });

          // Mark as delivered immediately since recipient is online
          await runQuery('UPDATE messages SET delivered_at = CURRENT_TIMESTAMP WHERE id = ?', [messageId]);
        }

        // Confirm to sender
        socket.emit('message:sent', {
          id: messageId,
          recipientId,
          sentAt: new Date().toISOString()
        });

      } catch (error) {
        console.error('Message send error:', error);
        socket.emit('error', { error: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing:start', (data) => {
      if (!socket.userId) return;

      const { recipientId } = data;
      const recipientSocketId = connectedUsers.get(recipientId);

      if (recipientSocketId) {
        io.to(recipientSocketId).emit('typing:start', {
          userId: socket.userId,
          username: socket.username
        });
      }
    });

    socket.on('typing:stop', (data) => {
      if (!socket.userId) return;

      const { recipientId } = data;
      const recipientSocketId = connectedUsers.get(recipientId);

      if (recipientSocketId) {
        io.to(recipientSocketId).emit('typing:stop', {
          userId: socket.userId,
          username: socket.username
        });
      }
    });

    // Handle message status updates
    socket.on('message:delivered', async (data) => {
      if (!socket.userId) return;

      const { messageId } = data;

      try {
        await runQuery('UPDATE messages SET delivered_at = CURRENT_TIMESTAMP WHERE id = ? AND recipient_id = ?',
          [messageId, socket.userId]);
      } catch (error) {
        console.error('Delivery status update error:', error);
      }
    });

    socket.on('message:read', async (data) => {
      if (!socket.userId) return;

      const { messageId } = data;

      try {
        await runQuery('UPDATE messages SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND recipient_id = ?',
          [messageId, socket.userId]);
      } catch (error) {
        console.error('Read status update error:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      if (socket.userId) {
        console.log(`User ${socket.username} disconnected`);

        // Remove from connected users
        connectedUsers.delete(socket.userId);

        // Broadcast offline status
        socket.broadcast.emit('user_offline', {
          userId: socket.userId,
          username: socket.username
        });
      }
    });
  });
}

// Helper function to get online users
export function getOnlineUsers() {
  return Array.from(connectedUsers.keys());
}

// Helper function to check if user is online
export function isUserOnline(userId) {
  return connectedUsers.has(userId);
}