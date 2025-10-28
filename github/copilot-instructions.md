# SecureDove – Copilot Instructions

Purpose: give AI agents the essentials to work productively in this repo (architecture, workflows, conventions, and integration patterns).

## Architecture Overview
- Client: React + Vite with Context providers for Auth, Conversations, Messages, WebSocket, and View state. API calls are centralized in `client/src/utils/api.js:35`. Crypto is all client‑side in `client/src/utils/crypto.js:20` (RSA‑OAEP for key wrapping, AES‑GCM for messages, PBKDF2 for private key encryption).
- Server: Node.js (ESM) + Express with modular routes (`server/routes/*.js`) and Socket.IO realtime in `server/server.js:55`. Database is SQLite via small helpers `run/get/all` in `server/config/database.js:24`.
- Zero‑knowledge: the server never sees plaintext messages or private keys. All payloads are encrypted client‑side and stored/transported as hex.
- Data model: per‑participant wrapped content keys in `conversations` (composite PK: id, content_key_number, username), and encrypted messages in `messages` with `sender_username` and `content_key_number`. Initialization/verification in `server/scripts/initDatabase.js:34` and `server/utils/databaseVerification.js:66`.

## Dev Workflows
- Install: `npm install` in `server/` and `client/`.
- DB: `cd server && npm run init-db`; verify: `npm run verify-db`.
- Run dev: `cd server && npm run dev` and `cd client && npm run dev`; or `./start.sh` from repo root.
- Env loading: server uses `server/config/env.js:27` (custom loader), not dotenv. Put vars in `server/.env`.
- Vite proxy/HTTPS: `client/vite.config.js:21` proxies `/api` and `/socket.io`; optional dev HTTPS via `VITE_DEV_CERT`/`VITE_DEV_KEY`. Generate with `node client/scripts/generate-devcert.mjs <host>`.

## Configuration (minimal)
- Server `.env`: `PORT`, `NODE_ENV`, `JWT_SECRET`, `DB_PATH`, `CORS_ORIGIN` (comma‑separated allowed origins; see `server/server.js:22`). Rate limit knobs: `RATE_LIMIT_*`, `LOGIN_RATE_LIMIT_*`.
- Client `.env`: `VITE_API_URL` (e.g., http://localhost:8000/api), optional `VITE_SOCKET_URL`.

## Server Conventions
- ESM everywhere. Export default Express routers from `server/routes/*.js`.
- Always protect routes with JWT middleware (`server/middleware/auth.js:3`) and apply rate limits (`server/middleware/rateLimiter.js:3`).
- Use DB helpers (`run/get/all` in `server/config/database.js:24`) and return consistent errors: `{ error: string }` (see `server/README.md:159`).
- Membership checks: before accessing messages or conversations, verify user membership (e.g., `server/routes/messages.js:19`).
- Key lifecycle: adding participants supports two modes in `server/routes/conversations.js:260`:
  - share_history: re‑wrap historical keys for new users;
  - rotate key: require increasing `content_key_number` and include all participants.
- Realtime: Socket.IO server emits to rooms:
  - user room: `user:{username}` for cross‑conversation events;
  - conversation room: `conversation:{id}` for message updates.
  Authentication and room joins are at `server/server.js:108` and `server/server.js:122`.

## Client Conventions
- API wrapper `request()` sets `Authorization: Bearer <token>` automatically from `localStorage` (`client/src/utils/api.js:16`). Keep new APIs consistent with existing shapes.
- Crypto:
  - RSA‑OAEP 2048/SHA‑256 for content key wrapping; AES‑GCM 256 with IV prefix for payloads (`client/src/utils/crypto.js:232`).
  - Private key encryption with PBKDF2‑derived AES‑GCM (`client/src/utils/crypto.js:117`).
- State management:
  - Conversations cache per conversation id keeps latest and historical content keys (`client/src/context/ConversationsContext.jsx:32`).
  - System broadcasts are encrypted messages with a `broadcast` object; builder at `client/src/context/ConversationsContext.jsx:244`. The Messages context normalizes these to system messages (`client/src/context/MessagesContext.jsx:64`).
- WebSocket: Provider connects, authenticates, and exposes `joinConversation/leaveConversation` (`client/src/context/WebSocketContext.jsx:34`, `:78`). Event listeners refresh conversations/messages (`client/src/context/ConversationsContext.jsx:107`, `client/src/context/MessagesContext.jsx:161`).

## When Adding Features
- New REST endpoint:
  1) Add route in `server/routes/*.js` (ESM export), guard with `authenticateToken`, use `run/get/all`.
  2) Validate inputs and enforce membership/zero‑knowledge (no plaintext on server).
  3) If state changes should be realtime, emit via `io.to('conversation:'+id)` or `io.to('user:'+username)`.
  4) Add matching client API in `client/src/utils/api.js`.
- New realtime event: add emit on server and handle in the relevant client context (`useWebSocket().on(...)`); if it affects conversations, call `loadConversations()`; for messages, decrypt with the correct `content_key_number` before updating state.

## Gotchas
- `CORS_ORIGIN` supports multiple origins (comma‑separated); same‑host heuristic is allowed (`server/server.js:22`).
- DB integrity is checked at startup (`server/server.js:131` → `ensureDatabaseIntegrity()`), which creates missing tables/indexes.
- Keep error responses and HTTP codes consistent with `server/README.md:168`.

