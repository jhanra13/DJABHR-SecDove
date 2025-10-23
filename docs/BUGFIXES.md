# SecureDove Bug Fix Log

This document records resolved bugs from chat-driven debugging sessions and provides a reusable template for future bug reports. It focuses on issues reproduced in the chat1.txt session, including the iterative CORS resolution, Socket.IO failures on Vercel, and database inconsistencies with serverless environments.

---

## Template: Bug Report and Fix

- Title:
- Date:
- Affected area(s): (client/server/deployment/infra)
- Severity / Impact:
- Symptoms (what users saw):
- Environment (URLs, env vars, versions):
- Reproduction steps:
- Expected vs actual:
- Signals and evidence collected:
  - Browser console/network traces
  - Server logs / platform logs
  - Commands run (include output summaries)
- Root cause analysis:
- Fix implemented:
  - Code changes (files touched)
  - Config changes (env vars, platform settings)
- Verification:
  - Tests or manual steps and observed results
- Regression risks and mitigations:
- Follow-ups / TODOs:

---

## Resolved Bugs (from chat1.txt session)

### 1) CORS preflight failing with missing Access-Control-Allow-Origin
- Date: 2025-10-23
- Affected: serverless handlers (Vercel), Express CORS flow
- Severity: High — blocks all cross-origin API calls (login/registration/check-username)
- Symptoms:
  - Browser console: "Access to fetch ... blocked by CORS policy: No 'Access-Control-Allow-Origin' header present" when calling `GET /api/auth/check-username/:username`.
  - Preflight (OPTIONS) sometimes not returning proper CORS headers.
- Environment:
  - Frontend: `https://secdove-frontend.vercel.app`
  - Backend: `https://secdove-backend.vercel.app`
  - CORS_ORIGIN expected to be exact and no trailing slash.
- Reproduction:
  1. Load the frontend and navigate to registration.
  2. Trigger username availability check.
  3. Observe network error in console.
- Evidence gathered:
  - Browser DevTools Network shows OPTIONS/GET blocked with missing ACAO.
  - Reason: server initialization could error before Express CORS middleware executed.
- Commands used (PowerShell-friendly):
  ```powershell
  # Preflight
  curl -i -X OPTIONS "https://secdove-backend.vercel.app/api/auth/check-username/alice" `
    -H "Origin: https://secdove-frontend.vercel.app" `
    -H "Access-Control-Request-Method: GET"

  # Actual request
  curl -i "https://secdove-backend.vercel.app/api/auth/check-username/alice" `
    -H "Origin: https://secdove-frontend.vercel.app"
  ```
- Root cause:
  - The serverless function attempted to import/start the server (which touches the DB) before any CORS headers were applied; when it failed early (e.g., DB not configured), the response had no CORS headers, so the browser surfaced a CORS error instead of a proper JSON error.
- Fix implemented:
  - `api/index.mjs` and `api/socketio.mjs`: always set CORS headers, handle OPTIONS with 204, and only then `import('../server/server.js')`; on failure, return JSON 500 with CORS.
  - `server/server.js`: update CORS middleware to set headers first, then enforce origin policy so even 403 responses include ACAO.
  - Ensure `CORS_ORIGIN` covers the exact frontend origin.
- Verification:
  - OPTIONS returns 204 with ACAO; GET returns JSON with ACAO or valid data.
- Follow-ups:
  - Keep `CORS_ORIGIN` in sync with any preview URLs if used (comma-separated list is supported by server logic).

### 2) Socket.IO handshake failing with 404 on Vercel
- Date: 2025-10-23
- Affected: deployment routing and client socket configuration
- Severity: High — realtime updates not delivered
- Symptoms:
  - Repeated 404s: `GET /socket.io/?EIO=4&transport=polling`
- Root cause:
  - Vercel routing didn’t consistently deliver Socket.IO paths to the Node server; serverless context needs a dedicated entry.
- Fix implemented:
  - `vercel.json`: route `/socket.io/(.*)` to `api/socketio.mjs`; keep `/api/(.*)` to `api/index.mjs`.
  - `api/socketio.mjs`: rewrite incoming URL to `/socket.io...` and delegate to shared `httpServer`.
  - `client/src/context/WebSocketContext.jsx`: support `VITE_SOCKET_PATH` (default `/socket.io`) and pass it to `socket.io-client`.
- Verification:
  - Browser shows Socket.IO connected; no more 404s; realtime events received in the conversation room.
- Follow-ups:
  - Ensure `VITE_SOCKET_URL` points to backend origin and `VITE_SOCKET_PATH` = `/socket.io` in production.

### 3) Database inconsistencies across sessions (duplicate users, missing contacts, 403 on conversations)
- Date: 2025-10-23
- Affected: DB initialization in serverless environments
- Severity: High — data appears to vanish or conflict; message sending denied
- Symptoms:
  - Same username registerable multiple times; adding contacts fails intermittently; sending messages sometimes 403 “Access denied to this conversation”.
- Root cause:
  - Vercel’s serverless functions have no persistent filesystem; previous code silently fell back to `/tmp` or `:memory:` SQLite, leading to divergent or ephemeral state across instances.
- Fix implemented:
  - `server/config/database.js` hardening:
    - Require `DB_PATH` for persistent DB on Vercel or explicit `ALLOW_EPHEMERAL_DB=true` for demo-only mode (warn loudly).
    - Apply PRAGMAs: `foreign_keys=ON`, `journal_mode=WAL`, `synchronous=NORMAL` for better reliability.
    - Add best-effort case-insensitive uniqueness: `CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_nocase ON users(username COLLATE NOCASE)`.
  - Documentation and env guidance provided.
- Verification:
  - With a persistent DB configured, users/contacts/conversations are consistent; sending messages returns 201 and realtime emits fire.
- Follow-ups:
  - Migrate to a managed database on Vercel (e.g., Postgres via Neon/Vercel Postgres/Supabase) or host the backend on a platform with persistent disk if SQLite is preferred.

### 4) Vercel deployment error: “Mixed routing properties” (legacy `routes` vs `rewrites/headers`)
- Date: 2025-10-22
- Affected: vercel.json config
- Severity: Blocker — deployment failed
- Symptoms:
  - Vercel build error complaining about using both `routes` and `rewrites/headers`.
- Fix implemented:
  - Removed the legacy `routes` block and kept only `rewrites` and `headers`.
- Verification:
  - Next deployment proceeded without the mixed routing error.

---

## Quick Reference: Env Variables
- Backend
  - `JWT_SECRET`: strong secret
  - `CORS_ORIGIN`: e.g., `https://secdove-frontend.vercel.app` (comma-separated if multiple)
  - Persistence (choose one):
    - `DB_PATH`: persistent DB path/connection (recommended)
    - `ALLOW_EPHEMERAL_DB=true`: demo-only, data in `/tmp` (not persistent)
- Frontend
  - `VITE_API_URL`: `https://secdove-backend.vercel.app/api`
  - `VITE_SOCKET_URL`: `https://secdove-backend.vercel.app`
  - `VITE_SOCKET_PATH`: `/socket.io`

---

## Notes
- Always validate that the backend returns CORS headers for OPTIONS and for error responses; set headers before any early returns.
- On Vercel, avoid relying on SQLite unless you accept ephemeral data; prefer a managed DB.
