# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SecureDove is an end-to-end encrypted (E2EE) messaging application built as a course project for CptS 428: Software Security and Reverse Engineering at WSU. The project demonstrates secure development practices including encryption, authentication, and resistance to common attacks.

**Tech Stack**: React (Vite) frontend, Node.js (Express) backend, SQLite database, Web Crypto API for E2EE

## Development Commands

### Starting the Application

**From repository root:**
- `npm run dev` - Starts both server and client concurrently
- `npm run build` - Builds both server and client
- `./start.sh` or `start.bat` - Platform-specific startup scripts

**Server only (from `/server`):**
- `npm run dev` - Start with Node.js --watch mode (auto-restart on changes)
- `npm start` - Start in production mode
- `npm run init-db` - Initialize database schema
- `npm run verify-db` - Verify database integrity

**Client only (from `/client`):**
- `npm run dev` - Start Vite dev server (default port 5173)
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build

### Database Management

The SQLite database is at `server/database/securedove.db`. Key scripts:
- `server/scripts/initDatabase.js` - Creates tables and schema
- `server/scripts/verifyDatabase.js` - Validates database integrity
- `server/scripts/fixMessagesSchema.js` - Schema migration utility

## Architecture Overview

### Security Model: Client-Side E2EE

**Critical principle**: The server NEVER sees plaintext messages or unencrypted private keys. All cryptographic operations (except password hashing) happen client-side using Web Crypto API.

**Cryptographic Flow:**
1. **Registration**: Client generates RSA-OAEP keypair (2048-bit), derives encryption key from password using PBKDF2, encrypts private key, sends encrypted private key + public key + password hash to server
2. **Login**: Server validates password hash and returns JWT + encrypted private key; client decrypts private key with password-derived key and holds it in memory
3. **Conversation Creation**: Client generates AES-GCM 256-bit content key, wraps it with each participant's RSA public key, stores wrapped keys server-side per participant
4. **Messaging**: Client encrypts message with conversation's content key (AES-GCM), sends ciphertext to server; recipients decrypt with their unwrapped content key
5. **Key Rotation**: Increments `content_key_number`, generates new content key, re-wraps for all participants

### Database Schema

**users**: Stores username, password_hash (bcrypt), public_key, salt, encrypted_private_key
**contacts**: User's contact list (many-to-many relationship via user IDs)
**conversations**: Stores per-participant wrapped content keys. Composite primary key: (conversation_id, content_key_number, username)
**messages**: Stores encrypted message content. References conversation_id and content_key_number

**Key rotation**: When participants are added or keys are rotated, `content_key_number` increments. New messages use the latest key number. Historical messages retain their original key number.

### Directory Structure

**Server (`/server`)**:
- `server.js` - Express app entry point, Socket.IO setup, CORS/security middleware
- `routes/` - API endpoints: `auth.js` (register/login), `contacts.js`, `conversations.js`, `messages.js`
- `middleware/` - JWT authentication (`auth.js`), rate limiting (`rateLimiter.js`)
- `config/` - `database.js` (SQLite connection + schema), `env.js` (environment config)
- `utils/` - `auth.js` (token verification), `databaseVerification.js`, `username.js` (validation)

**Client (`/client/src`)**:
- `App.jsx` - Main app component with routing logic
- `context/` - React contexts for state management:
  - `AuthContext.jsx` - User authentication, session management, key decryption
  - `ConversationsContext.jsx` - Conversation CRUD, key wrapping, participant management
  - `MessagesContext.jsx` - Message encryption/decryption, send/receive/edit/delete
  - `ContactsContext.jsx` - Contact list management
  - `WebSocketContext.jsx` - Socket.IO connection for real-time messaging
  - `ViewContext.jsx` - UI state (selected conversation, view mode)
- `components/` - UI components organized by feature (Chat, Contacts, Discussions, Modals, Settings, Sidebar, Layout)
- `utils/` - Core utilities:
  - `crypto.js` - Web Crypto API wrappers (key generation, RSA encrypt/decrypt, AES-GCM, PBKDF2, signatures)
  - `api.js` - REST API client (uses `VITE_API_URL` env var)
  - `keyStore.js` - In-memory private key storage during session
  - `messageStorage.js` - IndexedDB storage for decrypted messages client-side
  - `messageBackup.js` - Export/import encrypted message backups
- `hooks/` - Custom React hooks: `useConversations.js`, `useMessages.js`, `useNotifications.js`

### Real-Time Communication

**WebSocket (Socket.IO)** is used for:
- Real-time message delivery (`message:new`)
- Conversation participant events (`conversation:participant-added`, `conversation:participant-removed`)
- Key rotation events (`conversation:key-rotated`)
- System messages (join/leave notifications)

Connection established in `WebSocketContext.jsx` using `VITE_SOCKET_URL` environment variable.

## Environment Configuration

### Server Environment Variables (`.env` in `/server`)

Required variables (see `server/.env` or `.env.example` for reference):
- `PORT` - Server port (default: 8000)
- `NODE_ENV` - Environment mode (development/production)
- `JWT_SECRET` - Secret for JWT signing (MUST be strong in production)
- `DB_PATH` - SQLite database path (default: `./database/securedove.db`)
- `CORS_ORIGIN` - Allowed frontend origin (e.g., `http://localhost:5173`)
- `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_REQUESTS` - Global rate limiting
- `LOGIN_RATE_LIMIT_WINDOW_MS` / `LOGIN_RATE_LIMIT_MAX_REQUESTS` - Login-specific rate limiting

### Client Environment Variables (`.env` in `/client`)

Required variables:
- `VITE_API_URL` - Backend API URL (e.g., `http://localhost:8000/api`)
- `VITE_SOCKET_URL` - WebSocket server URL (e.g., `http://localhost:8000`)

See `client/.env.development` and `client/.env.production` for environment-specific examples.

## Key Implementation Details

### Message Flow (Client → Server → Client)

1. **Send**: Client encrypts with AES-GCM using conversation's content key → sends ciphertext via WebSocket or REST
2. **Server**: Stores ciphertext in database, broadcasts via Socket.IO to conversation participants
3. **Receive**: Client receives ciphertext → retrieves unwrapped content key from memory → decrypts with AES-GCM → displays plaintext

### Adding Participants to Conversations

Two modes (controlled by `shareHistory` flag):
- **With history sharing**: Re-wrap all historical content keys for new participant (they can decrypt past messages)
- **Without history sharing**: Rotate to new content key (new participant only sees future messages)

### Private Key Lifecycle

1. **Registration**: Generated client-side, encrypted with password-derived key (PBKDF2), stored server-side
2. **Login**: Retrieved from server, decrypted client-side using password, held in-memory via `keyStore.js`
3. **Session**: Used to decrypt wrapped content keys for conversations
4. **Logout/Close**: Cleared from memory

### Content Key Management

- Each conversation starts with `content_key_number = 1`
- Adding participants or manual rotation increments the key number
- Messages reference their `content_key_number` to know which key to use for decryption
- Client maintains map of `{conversation_id → {key_number → unwrapped_key}}` in memory

## Deployment Notes

The application supports deployment to Vercel (see `DEPLOYMENT.md` and `INTEGRATION_CHECKLIST.md`):
- Backend deployed as serverless function (Vercel Functions)
- Frontend deployed as static site
- **Database consideration**: SQLite is ephemeral in serverless environments; set `DB_PATH=/tmp/securedove.db` and `ALLOW_EPHEMERAL_DB=true` for demo purposes, or use a managed database for production

Production deployment requires:
- HTTPS (for secure cookie/JWT delivery and WebSocket security)
- Strong `JWT_SECRET`
- CORS configuration matching frontend domain
- Appropriate rate limiting for production traffic

## Security Considerations

When modifying code, maintain these security guarantees:
- Server must NEVER access plaintext messages or unencrypted private keys
- All message encryption/decryption happens client-side
- Private keys are only decrypted in-memory, never stored decrypted
- Password-derived keys use PBKDF2 with sufficient iterations
- Content keys are 256-bit AES-GCM with unique IVs per message
- RSA-OAEP for key wrapping (2048-bit minimum)
- JWT tokens are HttpOnly/Secure in production
- Rate limiting prevents brute force attacks
- Input validation prevents SQL injection and XSS
- Foreign key constraints enforce referential integrity
