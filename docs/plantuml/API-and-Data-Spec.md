SecureDove API and Data Specification (from code)

Server Base: `http://localhost:3000` (default `PORT`), API base path `/api`

Auth
- POST `/api/auth/register`
  - Request: { username, password, public_key, salt, encrypted_private_key }
  - Response 201: { message, user:{ id, username, public_key, salt, encrypted_private_key }, token }
- POST `/api/auth/login`
  - Request: { username, password }
  - Response 200: { message, user:{ id, username, public_key, salt, encrypted_private_key }, token }
- GET `/api/auth/user` (Bearer token)
  - Response 200: { user:{ id, username, public_key, salt, encrypted_private_key, created_at } }
- POST `/api/auth/logout` (Bearer token)
  - Response 200: { message }
- GET `/api/auth/check-username/:username`
  - Response 200: { exists: boolean }

Contacts (Bearer token)
- POST `/api/contacts`
  - Request: { contact_username }
  - Response 201: { message, contact:{ id, contact_user_id, contact_username, public_key, added_at } }
- GET `/api/contacts`
  - Response 200: { contacts:[ { id, contact_user_id, contact_username, added_at, public_key } ] }
- DELETE `/api/contacts/:contactId`
  - Response 200: { message }
- GET `/api/contacts/:username/public-key`
  - Response 200: { user_id, username, public_key }

Conversations (Bearer token)
- POST `/api/conversations`
  - Request: { conversation_entries: [ { id, content_key_number, username, encrypted_content_key } ] }
  - Response 201: { message, conversation:{ id, content_key_number, participants[], created_at } }
- GET `/api/conversations`
  - Response 200: { conversations:[ { id, content_key_number, encrypted_content_key, participants[], created_at, keys:[{ content_key_number, encrypted_content_key, created_at }] } ] }
- GET `/api/conversations/:conversationId`
  - Response 200: { conversation:{ id, content_key_number, encrypted_content_key, participants[], created_at, keys:[...] } }
- DELETE `/api/conversations/:conversationId`
  - Removes only the requester’s membership (conversation remains for others)
  - Requires the user to have the latest content key
  - Response 200: { message }
- POST `/api/conversations/:conversationId/participants`
  - Request:
    - share_history = true → { share_history: true, entries:[ { username, keys:[ { content_key_number, encrypted_content_key } ] } ] }
    - share_history = false → { share_history: false, content_key_number, entries:[ { username, encrypted_content_key } ] }
  - Response 200: { message, share_history, (content_key_number when rotated), participants[] }

Messages (Bearer token)
- POST `/api/messages`
  - Request: { conversation_id, content_key_number, encrypted_msg_content }
  - Response 201: { message, messageData:{ id, conversation_id, content_key_number, encrypted_msg_content, created_at, is_deleted } }
- GET `/api/messages/:conversationId` (query: limit=50, offset=0)
  - Response 200: { messages:[ { id, conversation_id, content_key_number, encrypted_msg_content, created_at, updated_at, is_deleted } ], pagination:{ total, limit, offset } }
- PUT `/api/messages/:messageId`
  - Request: { encrypted_msg_content }
  - Response 200: { message, messageData:{ id, encrypted_msg_content, updated_at } }
- DELETE `/api/messages/:messageId`
  - Response 200: { message }
- GET `/api/messages/recent/all` (query: limit=20)
  - Response 200: { messages:[ { id, conversation_id, content_key_number, encrypted_msg_content, created_at, updated_at } ] }

Database Schema (SQLite)
- users(id PK, username UNIQUE, password_hash, public_key, salt, encrypted_private_key, created_at)
- contacts(id PK, user_id FK -> users.id, contact_user_id FK -> users.id, contact_username, added_at, UNIQUE(user_id, contact_user_id))
- conversations(PK(id, content_key_number, username), username FK -> users.username, encrypted_content_key, created_at)
- messages(id PK, conversation_id, content_key_number, encrypted_msg_content, created_at, updated_at?, is_deleted)

Auth & Security
- Password hashing: bcrypt with 12 rounds
- JWT: payload { userId, username }, 24h expiry, secret `JWT_SECRET`
- Rate limiting: general 100/15m, login 5/15m (skipSuccessfulRequests)
- CORS origin: `CORS_ORIGIN` or `http://localhost:5173`

Client E2EE
- RSA-OAEP 2048/SHA-256 keypair per user; public key stored server-side; private key encrypted client-side with AES-GCM using PBKDF2-derived key from password+salt (100k iterations, SHA-256)
- Conversation content keys: AES-GCM 256-bit; content key encrypted per participant with their RSA public key; decrypted with private key on client
- Messages: JSON { sender, timestamp, content } encrypted via AES-GCM with conversation content key; IV prepended to ciphertext in hex encoding for transport

Real-time
- Socket.IO server emits `new-message` to room `conversation:<id>` on message creation
- Client connects to `import.meta.env.VITE_SOCKET_URL` (default `http://localhost:8000`) in `WebSocketContext.jsx`

Middleware Flow
- helmet(CSP,HSTS) → cors → json/urlencoded parsers → rate limit (/api/*) → routes → 404 → global error handler

Environment
- Minimal .env reader in server reads `server/.env` if present (no dotenv dependency).
- Important vars: `PORT`, `JWT_SECRET`, `DB_PATH`, `CORS_ORIGIN`, rate limit values.

Client Libraries
- HTTP client: native fetch (axios removed)
- Icons: inline SVGs (Font Awesome removed)
