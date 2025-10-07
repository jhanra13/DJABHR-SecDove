# Real-Time Messaging Test Guide

## Current Status
✅ Server running with enhanced logging
✅ WebSocket connections working (clients connecting and authenticating)
✅ Session persistence fixed (no more logout on reload)

## Testing Steps

### Step 1: Verify WebSocket Connection

**On Client Side (Browser Console F12)**:

After login, you should see:
```
🔌 Connecting to Socket.IO server...
✅ Socket.IO connected: <socket-id>
✅ Socket authenticated
```

Check connection status:
```javascript
window.__websocket__
// Should show: { connected: true, socket: {...} }
```

### Step 2: Open a Conversation

**Client Console**:
```
🚪 Joining conversation room: <conversation-id>
👂 Setting up new-message listener
```

**Server Console**:
```
✅ User [username] joined conversation:[id]
👥 Total clients in room: 1
```

### Step 3: Send a Message

**Server Console Should Show**:
```
POST /api/messages
📡 IO instance available: true
📨 Emitting new-message to room: conversation:[id]
📦 Message data: { id: X, conversation_id: Y }
👥 Clients in room: 1 (or 2 if both users are in conversation)
✅ Emitted new-message event
```

**Client Console (Receiver) Should Show**:
```
📨 Received new message: {...}
🔑 Looking for content key for conversation: <id>
✅ Content key found, decrypting message...
✅ Message decrypted: { sender: "...", timestamp: ... }
✅ Updated messages state for conversation: <id>
📊 Total messages now: X
✅ Added real-time message to state
```

## Troubleshooting

### Issue: No logs when joining conversation

**Check**:
```javascript
// In browser console
window.__messages_debug__
// Look at: activeConversation (should match the conversation ID)
```

**Solution**: Make sure `loadMessages` is called when opening a conversation

### Issue: "Clients in room: 0" when sending message

**Cause**: Client not joined to the conversation room

**Debug**:
1. Check if `joinConversation` is being called
2. Verify conversation ID matches between join and emit
3. Check if WebSocket is connected before joining

**Fix**: Ensure `MessagesContext` calls `joinConversation` in useEffect

### Issue: Message sent but not appearing

**Check server logs for**:
- `📡 IO instance available: false` → io not set up correctly
- `👥 Clients in room: 0` → No clients listening in that room
- No emit logs at all → Message save might have failed

**Check client logs for**:
- Nothing → Client not receiving events
- `❌ No content key` → Encryption key not loaded
- `❌ Failed to decrypt` → Key mismatch

### Issue: Multiple duplicate messages

**Cause**: Multiple event listeners attached

**Solution**: Check if `off()` is called properly in useEffect cleanup

## Expected Behavior

### Scenario 1: Same User, Two Windows

1. Open Window A (user: hi89)
2. Open Window B (user: hi89)  
3. Both open same conversation
4. Server shows: `👥 Total clients in room: 2`
5. Send message from Window A
6. Message appears in BOTH windows instantly

### Scenario 2: Two Different Users

1. Window A (user: hi89) opens conversation
2. Server shows: `👥 Total clients in room: 1`
3. Window B (user: lo89) opens same conversation
4. Server shows: `👥 Total clients in room: 2`
5. Send message from Window A
6. Message appears in Window B instantly
7. Send message from Window B
8. Message appears in Window A instantly

### Scenario 3: One User Not in Conversation

1. Window A (hi89) in conversation 123
2. Window B (hi89) in conversation 456
3. Send message in conversation 123
4. Should NOT appear in Window B (different conversation)

## Debug Commands

### Check if room exists on server

Add this to server console (in server.js):
```javascript
// Log all rooms
console.log('All rooms:', Array.from(io.sockets.adapter.rooms.keys()));

// Log specific conversation room
const room = io.sockets.adapter.rooms.get('conversation:1759832792936');
console.log('Conversation room size:', room ? room.size : 'Not found');
```

### Check client's rooms

Add to server on socket connect:
```javascript
socket.on('get-rooms', () => {
  const rooms = Array.from(socket.rooms);
  console.log('Socket', socket.id, 'is in rooms:', rooms);
  socket.emit('rooms-list', rooms);
});
```

Then in client console:
```javascript
window.__websocket__.emit('get-rooms');
```

### Force emit test message

In server console or add endpoint:
```javascript
// Test emit
io.to('conversation:1759832792936').emit('test-event', { message: 'Hello' });
```

In client, listen for test:
```javascript
window.__websocket__.on('test-event', (data) => {
  console.log('Test event received:', data);
});
```

## Common Fixes

### Fix 1: Ensure joinConversation is called

In `MessagesContext.jsx`, verify this useEffect exists:
```javascript
useEffect(() => {
  if (activeConversation && connected) {
    console.log('🚪 Joining conversation room:', activeConversation);
    joinConversation(activeConversation);
  }
}, [activeConversation, connected, joinConversation]);
```

### Fix 2: Ensure loadMessages sets activeConversation

```javascript
const loadMessages = async (conversationId) => {
  // Set as active conversation for WebSocket room
  setActiveConversation(conversationId);  // ← This line is critical
  // ... rest of code
}
```

### Fix 3: Verify io is set in app

In `server.js`:
```javascript
app.set('io', io);  // ← Must be before routes
```

### Fix 4: Check CORS for WebSocket

In `server.js`, Socket.IO setup:
```javascript
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000',  // ← Must match client port
    credentials: true,
    methods: ['GET', 'POST']
  }
});
```

## Next Steps

1. **Login to the app** in two windows
2. **Watch server console** for connection logs
3. **Open same conversation** in both windows
4. **Verify server shows** "👥 Total clients in room: 2"
5. **Send a message** and watch both consoles
6. **Share the logs** if still not working

The enhanced logging will show us exactly where the issue is!
