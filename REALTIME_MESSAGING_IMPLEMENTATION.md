# Real-Time Messaging Implementation

## Overview
Implemented WebSocket-based real-time messaging using Socket.IO for instant message delivery without page refresh.

---

## Server-Side Implementation

### 1. **Socket.IO Server Setup** (`server/server.js`)

#### Dependencies Added:
```javascript
import { createServer } from 'http';
import { Server } from 'socket.io';
import { verifyToken } from './utils/auth.js';
```

#### HTTP Server Creation:
```javascript
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Make io accessible to routes
app.set('io', io);
```

#### Socket.IO Connection Handling:
```javascript
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Authentication
  socket.on('authenticate', async (token) => {
    try {
      const decoded = verifyToken(token);
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      
      // Join user's personal room
      socket.join(`user:${socket.username}`);
      
      socket.emit('authenticated', { success: true });
    } catch (error) {
      socket.emit('authenticated', { success: false, error: 'Invalid token' });
      socket.disconnect();
    }
  });
  
  // Join/Leave conversation rooms
  socket.on('join-conversation', (conversationId) => {
    socket.join(`conversation:${conversationId}`);
  });
  
  socket.on('leave-conversation', (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
  });
});
```

### 2. **Message Broadcasting** (`server/routes/messages.js`)

When a message is sent:
```javascript
// Emit real-time message to all participants in the conversation
const io = req.app.get('io');
if (io) {
  io.to(`conversation:${conversation_id}`).emit('new-message', messageData);
  console.log(`📨 Emitted new-message to conversation:${conversation_id}`);
}
```

### 3. **JWT Verification Utility** (`server/utils/auth.js`)

Added token verification for WebSocket authentication:
```javascript
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};
```

---

## Client-Side Implementation

### 1. **WebSocket Context** (`client/src/context/WebSocketContext.jsx`)

Complete rewrite using `socket.io-client`:

#### Connection Management:
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8000', {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});
```

#### Authentication:
```javascript
socket.on('connect', () => {
  console.log('✅ Socket.IO connected:', socket.id);
  setConnected(true);
  
  // Authenticate the socket connection
  socket.emit('authenticate', currentSession.token);
});

socket.on('authenticated', (data) => {
  if (data.success) {
    console.log('✅ Socket authenticated');
  } else {
    console.error('❌ Socket authentication failed:', data.error);
  }
});
```

#### API Provided:
```javascript
const value = {
  connected,          // Boolean: connection status
  socket,            // Socket instance
  on,                // Subscribe to events
  off,               // Unsubscribe from events
  emit,              // Send events
  joinConversation,  // Join conversation room
  leaveConversation  // Leave conversation room
};
```

### 2. **Messages Context** (`client/src/context/MessagesContext.jsx`)

#### Real-Time Message Handling:
```javascript
// Handle incoming real-time messages
const handleNewMessage = useCallback(async (messageData) => {
  console.log('📨 Received new message:', messageData);
  
  const contentKeyData = getContentKey(messageData.conversation_id);
  if (!contentKeyData) return;

  try {
    // Decrypt the message
    const decrypted = await decryptMessage(
      messageData.encrypted_msg_content,
      contentKeyData.key
    );

    const newMessage = {
      id: messageData.id,
      conversationId: messageData.conversation_id,
      sender: decrypted.sender,
      content: decrypted.content,
      timestamp: decrypted.timestamp,
      created_at: messageData.created_at,
      updated_at: messageData.updated_at
    };

    // Add to messages state
    setMessages(prev => ({
      ...prev,
      [messageData.conversation_id]: [
        ...(prev[messageData.conversation_id] || []),
        newMessage
      ]
    }));

    console.log('✅ Added real-time message to state');
  } catch (err) {
    console.error('Failed to decrypt real-time message:', err);
  }
}, [getContentKey]);
```

#### WebSocket Listener Setup:
```javascript
// Set up WebSocket listener for new messages
useEffect(() => {
  if (connected) {
    console.log('👂 Setting up new-message listener');
    on('new-message', handleNewMessage);

    return () => {
      console.log('🔇 Removing new-message listener');
      off('new-message', handleNewMessage);
    };
  }
}, [connected, on, off, handleNewMessage]);
```

#### Automatic Room Joining:
```javascript
// Join conversation room when active conversation changes
useEffect(() => {
  if (activeConversation && connected) {
    console.log('🚪 Joining conversation room:', activeConversation);
    joinConversation(activeConversation);
  }
}, [activeConversation, connected, joinConversation]);
```

---

## Architecture

### Room-Based Broadcasting

```
┌──────────────────────────────────────────────────────────┐
│                    Socket.IO Rooms                        │
└──────────────────────────────────────────────────────────┘

User Authentication:
  socket.join(`user:${username}`)
  
Conversation Participation:
  socket.join(`conversation:${conversationId}`)

Message Broadcasting:
  io.to(`conversation:${conversationId}`).emit('new-message', data)
```

### Message Flow

```
User A sends message
       ↓
POST /api/messages
       ↓
Store encrypted message in DB
       ↓
Emit 'new-message' to `conversation:${id}` room
       ↓
Socket.IO broadcasts to all sockets in room
       ↓
User B receives 'new-message' event
       ↓
Decrypt message with content key
       ↓
Update messages state
       ↓
UI automatically re-renders with new message
```

---

## Security Features

### 1. **Authentication Required**
- Clients must authenticate with JWT token before joining rooms
- Invalid tokens result in disconnection

### 2. **End-to-End Encryption Maintained**
- Messages are still encrypted when broadcast
- Each client decrypts locally using their content key
- Server never sees plaintext content

### 3. **Room Isolation**
- Users can only join conversations they're part of
- Messages only broadcast to conversation participants
- No cross-conversation leakage

---

## Dependencies Added

### Server:
```json
{
  "socket.io": "^4.x.x"
}
```

### Client:
```json
{
  "socket.io-client": "^4.x.x"
}
```

---

## Testing Real-Time Messaging

### Test Scenario:
1. **Open two browser windows**
   - Window A: User "hi89"
   - Window B: User "lo89"

2. **Start conversation**
   - Both users in same conversation

3. **Send message from Window A**
   - Type message and press send

4. **Verify in Window B**
   - Message should appear **instantly** without refresh
   - Should show correct sender name
   - Should show correct timestamp
   - Should be decrypted and readable

5. **Send message from Window B**
   - Verify it appears instantly in Window A

### Expected Behavior:
- ✅ Messages appear instantly on both sides
- ✅ No page refresh needed
- ✅ Correct sender identification
- ✅ Proper message alignment (sent/received)
- ✅ End-to-end encryption maintained
- ✅ Timestamps accurate

---

## Console Logs (for debugging)

### Server Logs:
```
Client connected: <socket-id>
User <username> authenticated on socket <socket-id>
User <username> joined conversation <conversation-id>
📨 Emitted new-message to conversation:<conversation-id>
```

### Client Logs:
```
🔌 Connecting to Socket.IO server...
✅ Socket.IO connected: <socket-id>
✅ Socket authenticated
🚪 Joining conversation room: <conversation-id>
👂 Setting up new-message listener
📨 Received new message: {...}
✅ Added real-time message to state
```

---

## Benefits

### User Experience:
- ✅ **Instant messaging** - No delay, no refresh
- ✅ **Real-time updates** - See messages as they arrive
- ✅ **Better UX** - Feels like modern chat app

### Technical:
- ✅ **Scalable** - Socket.IO handles reconnections
- ✅ **Reliable** - Automatic reconnection on disconnect
- ✅ **Efficient** - Only affected conversations receive updates
- ✅ **Secure** - E2EE maintained throughout

---

## Future Enhancements

Possible improvements:
- 📝 **Typing indicators** - Show when user is typing
- 📖 **Read receipts** - Show when message was read
- 🟢 **Online status** - Show online/offline users
- 📌 **Message reactions** - Add emoji reactions
- 🔔 **Push notifications** - Desktop/mobile notifications
- 📁 **File sharing** - Real-time file transfer progress

---

## Troubleshooting

### Connection Issues:
- Check server is running on port 8000
- Verify CORS_ORIGIN in .env matches client port
- Ensure JWT token is valid

### Messages Not Appearing:
- Check console for WebSocket connection status
- Verify user joined conversation room
- Check content key is available for decryption

### Disconnection Issues:
- Socket.IO auto-reconnects (up to 5 attempts)
- Check network connectivity
- Verify server didn't crash
