// socket-test-auth.mjs
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:8000';
const TOKEN = process.env.TEST_TOKEN || '';
const TARGET_CONVO = process.env.TARGET_CONVO || '1761464382860';

console.log('SOCKET_URL:', SOCKET_URL);
console.log('TARGET_CONVO:', TARGET_CONVO);

const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  autoConnect: true,
  reconnection: false
});

socket.on('connect', () => {
  console.log('connected', socket.id);
  // Emit authenticate event as your server expects
  console.log('emitting authenticate event with token present?', !!TOKEN);
  socket.emit('authenticate', TOKEN);

  // Give server a brief moment to respond to authentication before joining/sending
  setTimeout(() => {
    console.log('Attempting to join conversation:', TARGET_CONVO);
    socket.emit('join-conversation', TARGET_CONVO, (ack) => {
      console.log('join ack (if any):', ack);
    });

    console.log('Attempting to send message to conversation:', TARGET_CONVO);
    socket.emit('send-message', {
      conversation_id: TARGET_CONVO,
      content_key_number: 1,
      encrypted_msg_content: 'POC: unauthorized send test'
    }, (res) => {
      console.log('send ack (if any):', res);
    });
  }, 250); // 250ms delay to let auth handler run
});

socket.on('authenticated', (d) => console.log('authenticated event:', d));
socket.on('connect_error', (err) => console.error('connect_error:', err && err.message ? err.message : err));
socket.on('message', (m) => console.log('message event received:', m));
socket.on('disconnect', (reason) => console.log('socket disconnected:', reason));

setTimeout(() => {
  socket.close();
  process.exit(0);
}, 8000);
