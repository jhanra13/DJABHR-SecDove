// socket-test.mjs
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:8000';
const TOKEN = process.env.TEST_TOKEN || '';
const TARGET_CONVO = process.env.TARGET_CONVO || 'replace-with-target-convo-id';

console.log('SOCKET_URL:', SOCKET_URL);
console.log('TARGET_CONVO:', TARGET_CONVO);

const socket = io(SOCKET_URL, {
  auth: { token: TOKEN },
  transports: ['websocket'],
  autoConnect: true,
  reconnection: false
});

socket.on('connect', () => {
  console.log('connected', socket.id);
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
});

socket.on('message', (m) => {
  console.log('message event received:', m);
});

socket.on('authenticated', (d) => console.log('authenticated:', d));
socket.on('connect_error', (err) => console.error('connect_error:', err && err.message ? err.message : err));
socket.on('disconnect', (reason) => console.log('socket disconnected:', reason));

setTimeout(() => {
  socket.close();
  process.exit(0);
}, 8000);
