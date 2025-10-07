# Real-Time Messaging Troubleshooting Guide

## Issues Identified

### 1. **Session Persistence Issue** ✅ FIXED
**Problem**: User gets logged out on page reload
**Cause**: privateKey check was forcing logout because privateKey is not stored in localStorage (correct security practice)
**Solution**: Modified session restoration to keep user logged in with token, privateKey will be null until needed

**Changes Made**:
- `AuthContext.jsx`: Removed privateKey validation check that was clearing session
- Session now persists with token across page reloads
- User stays logged in, privateKey remains in memory during session

### 2. **Real-Time Messages Not Updating** 🔧 DEBUGGING

**Checklist**:

#### Server Side:
- [✅] Socket.IO server running on port 8000
- [✅] WebSocket enabled in server.js
- [✅] Messages route emits 'new-message' events
- [✅] Room-based broadcasting implemented

#### Client Side:
- [✅] socket.io-client installed
- [✅] WebSocketContext connects to server
- [✅] MessagesContext listens for 'new-message' events
- [❓] Need to verify connection status

## Debug Steps

### Step 1: Check WebSocket Connection

Open browser console (F12) and look for these logs:

**Expected Logs**:
```
🌐 WebSocketContext: Module loaded
🌐 WebSocketProvider: Initializing...
🔌 Connecting to Socket.IO server...
✅ Socket.IO connected: <socket-id>
✅ Socket authenticated
```

**If you see connection errors**:
- Check server is running on port 8000
- Verify CORS settings match client port
- Check network tab for WebSocket connection

### Step 2: Verify Room Joining

When you open a conversation, you should see:
```
🚪 Joining conversation room: <conversation-id>
👂 Setting up new-message listener
```

**If not seeing these**:
- WebSocket not connected
- MessagesContext not properly set up

### Step 3: Send Test Message

When sending a message, check:

**Server logs should show**:
```
POST /api/messages
📨 Emitted new-message to conversation:<id>
```

**Client logs should show**:
```
📨 Received new message: {...}
✅ Added real-time message to state
```

### Step 4: Check Both Windows

Open two browser windows:
1. Window A: User "hi89"
2. Window B: User "lo89"
3. Both in same conversation
4. Send from Window A
5. Should appear in Window B instantly

## Common Issues & Solutions

### Issue: "Socket.IO not connecting"

**Check**:
1. Server running? `npm start` in server folder
2. Port correct? Should be `http://localhost:8000`
3. CORS enabled? Check server logs for CORS errors

**Fix**:
```javascript
// In WebSocketContext.jsx, verify URL
const socket = io('http://localhost:8000', {
  autoConnect: true,
  reconnection: true
});
```

### Issue: "Messages not appearing"

**Check**:
1. WebSocket connected? Check `connected` state
2. Room joined? Look for "Joining conversation room" log
3. Event listener active? Look for "Setting up new-message listener"

**Debug**:
Add console log in handleNewMessage:
```javascript
const handleNewMessage = useCallback(async (messageData) => {
  console.log('🎯 DEBUG: Received message:', messageData);
  // ... rest of code
}, [getContentKey]);
```

### Issue: "Conversation not loading"

**Check**:
1. Token valid? Check localStorage.getItem('token')
2. Session restored? Check currentSession in AuthContext
3. Content key available? Check getContentKey returns key

### Issue: "Server not emitting events"

**Check server logs for**:
```
📨 Emitted new-message to conversation:<id>
```

**If not seeing**:
- io instance not properly passed to routes
- Room name mismatch
- Message save failed before emit

**Fix in messages route**:
```javascript
const io = req.app.get('io');
console.log('DEBUG: io instance:', !!io);
console.log('DEBUG: emitting to room:', `conversation:${conversation_id}`);
io.to(`conversation:${conversation_id}`).emit('new-message', messageData);
```

## Testing Real-Time Messaging

### Test 1: Basic Message Flow
1. Open DevTools in both windows (F12)
2. Send message from Window A
3. Check console logs in both windows
4. Verify message appears in Window B

### Test 2: Multiple Messages
1. Send 3-5 messages rapidly
2. All should appear in order
3. No duplicates
4. Correct sender names

### Test 3: Reconnection
1. Stop server
2. Restart server
3. WebSocket should auto-reconnect
4. Messages should still work

### Test 4: Different Conversations
1. Create 2 different conversations
2. Send message in Conversation A
3. Verify it doesn't appear in Conversation B
4. Room isolation working

## Manual Debugging Commands

### Check WebSocket Connection:
```javascript
// In browser console
const ws = window.__websocket__;
console.log('Connected:', ws?.connected);
console.log('Socket ID:', ws?.socket?.id);
```

### Check Messages State:
```javascript
// Add to MessagesContext
window.__messages_debug__ = {
  messages,
  connected,
  activeConversation
};

// Then in console
console.log(window.__messages_debug__);
```

### Force Reconnect:
```javascript
// In browser console
window.location.reload();
// WebSocket should auto-reconnect
```

## Next Steps

If messages still not updating:

1. **Check server terminal** for WebSocket connection logs
2. **Check browser console** for WebSocket errors
3. **Check network tab** for WebSocket connection (WS protocol)
4. **Verify room names match** between emit and join
5. **Check if io instance is null** in messages route

## Expected Behavior After Fixes

- ✅ User stays logged in after page reload
- ✅ Token persists in localStorage
- ✅ WebSocket auto-connects on login
- ✅ Messages appear instantly without refresh
- ✅ Sender names and timestamps correct
- ✅ Messages encrypted end-to-end
- ✅ Different conversations isolated

