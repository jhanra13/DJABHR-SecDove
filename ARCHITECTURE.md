# SecDove Architecture Documentation

## System Architecture Overview

SecDove follows a client-server architecture where the client handles all encryption/decryption operations, and the server acts as a message relay and storage system without access to message plaintext.

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                              │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────┐              │
│  │ React UI   │→ │ Crypto Layer │→ │ API/Socket  │              │
│  │ Components │  │ (Web Crypto) │  │ Services    │              │
│  └────────────┘  └──────────────┘  └─────────────┘              │
└───────────────────────────┬──────────────────────────────────────┘
                            │ HTTPS/WSS
                            │ (Encrypted Transport)
┌───────────────────────────▼──────────────────────────────────────┐
│                        SERVER LAYER                               │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────┐              │
│  │ Express    │→ │ Socket.io    │→ │ Auth/JWT    │              │
│  │ REST API   │  │ WebSocket    │  │ Middleware  │              │
│  └────────────┘  └──────────────┘  └─────────────┘              │
└───────────────────────────┬──────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────┐
│                      PERSISTENCE LAYER                            │
│  ┌─────────────────┐              ┌──────────────┐              │
│  │   PostgreSQL    │              │    Redis     │              │
│  │ (User Data,     │              │  (Sessions,  │              │
│  │  Encrypted      │              │   Cache)     │              │
│  │  Messages)      │              │              │              │
│  └─────────────────┘              └──────────────┘              │
└──────────────────────────────────────────────────────────────────┘
```

## Component Details

### Client Architecture

#### 1. Presentation Layer (React Components)
- **Auth Components**: Login, Register
- **Chat Components**: ChatWindow, MessageList, MessageInput, ContactList
- **Layout Components**: Header, Sidebar, Navigation

#### 2. State Management
- **Auth State**: User credentials, tokens, session info
- **Chat State**: Active conversations, messages, contacts
- **UI State**: Loading states, modals, notifications

#### 3. Crypto Layer
**Key Management**:
- Generate RSA-OAEP 2048-bit or Curve25519 key pairs
- Store private keys in IndexedDB (encrypted with derived password key)
- Retrieve public keys from server

**Encryption Process**:
```javascript
// Hybrid encryption scheme
1. Generate random AES-GCM 256-bit key
2. Encrypt message with AES-GCM (authenticated encryption)
3. Encrypt AES key with recipient's public key (RSA-OAEP)
4. Package: { encryptedMessage, encryptedKey, iv, authTag }
```

**Decryption Process**:
```javascript
1. Decrypt AES key using private key (RSA-OAEP)
2. Decrypt message using AES key + IV
3. Verify authentication tag (GCM mode)
```

#### 4. Service Layer
- **API Service**: HTTP requests to REST endpoints
- **WebSocket Service**: Real-time message delivery
- **Encryption Service**: All crypto operations
- **Storage Service**: IndexedDB operations for keys and local data

### Server Architecture

#### 1. API Layer (Express)
**Responsibilities**:
- Handle HTTP requests
- Route to appropriate controllers
- Apply middleware (auth, validation, error handling)
- Return JSON responses

**Key Routes**:
- `/api/auth/*` - Authentication endpoints
- `/api/users/*` - User management
- `/api/messages/*` - Message CRUD operations
- `/api/contacts/*` - Contact management

#### 2. WebSocket Layer (Socket.io)
**Responsibilities**:
- Maintain persistent connections
- Real-time message delivery
- Presence detection (online/offline)
- Typing indicators

**Event Handlers**:
```javascript
// Connection management
socket.on('authenticate', handleAuth)
socket.on('disconnect', handleDisconnect)

// Messaging
socket.on('message:send', forwardMessage)
socket.on('typing:start', broadcastTyping)
socket.on('typing:stop', broadcastTyping)

// Status
socket.on('message:delivered', updateStatus)
socket.on('message:read', updateStatus)
```

#### 3. Business Logic Layer
**Controllers**:
- Parse and validate requests
- Call service methods
- Format responses

**Services**:
- Implement business logic
- Interact with database
- Handle complex operations

#### 4. Data Access Layer
**Models**: Define database schemas and relationships
**Repositories**: Database query abstractions

### Database Design

#### User Table
```sql
users (
  id: UUID PRIMARY KEY,
  username: VARCHAR(255) UNIQUE NOT NULL,
  email: VARCHAR(255) UNIQUE NOT NULL,
  password_hash: VARCHAR(255) NOT NULL,
  public_key: TEXT NOT NULL,
  salt: VARCHAR(255) NOT NULL,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  last_seen: TIMESTAMP
)
```

#### Message Table
```sql
messages (
  id: UUID PRIMARY KEY,
  sender_id: UUID FK → users.id,
  recipient_id: UUID FK → users.id,
  encrypted_content: TEXT NOT NULL,
  encrypted_key: TEXT NOT NULL,
  iv: TEXT NOT NULL,
  auth_tag: TEXT NOT NULL,
  sent_at: TIMESTAMP,
  delivered_at: TIMESTAMP,
  read_at: TIMESTAMP,
  deleted_by_sender: BOOLEAN DEFAULT FALSE,
  deleted_by_recipient: BOOLEAN DEFAULT FALSE
)
```

#### Contact Table
```sql
contacts (
  id: UUID PRIMARY KEY,
  user_id: UUID FK → users.id,
  contact_id: UUID FK → users.id,
  nickname: VARCHAR(255),
  created_at: TIMESTAMP,
  UNIQUE(user_id, contact_id)
)
```

## Security Architecture

### 1. End-to-End Encryption Flow

```
Alice (Sender)                 Server                  Bob (Recipient)
     │                            │                           │
     │ 1. Request Bob's public key                          │
     │──────────────────────────→│                           │
     │                            │ 2. Return public key     │
     │                            │←─────────────────────────│
     │                            │                           │
     │ 3. Encrypt message         │                           │
     │    with Bob's public key   │                           │
     │                            │                           │
     │ 4. Send encrypted message  │                           │
     │──────────────────────────→│                           │
     │                            │ 5. Forward encrypted msg  │
     │                            │─────────────────────────→│
     │                            │                           │
     │                            │           6. Decrypt with │
     │                            │              private key  │
     │                            │                           │
```

### 2. Key Management

**Private Key Protection**:
1. Never transmitted to server
2. Encrypted at rest using password-derived key (PBKDF2)
3. Stored in IndexedDB (browser secure storage)
4. Loaded into memory only when needed

**Password Derivation**:
```javascript
// Client-side key derivation
userKey = PBKDF2(password, salt, iterations=100000, hashAlg=SHA-256)

// Private key encryption
encryptedPrivateKey = AES-GCM(privateKey, userKey)
```

### 3. Authentication Flow

```
1. User Registration:
   - Client: hash password with bcrypt
   - Client: generate key pair
   - Client: send {username, email, passwordHash, publicKey}
   - Server: store in database

2. User Login:
   - Client: send {email, password}
   - Server: verify password hash
   - Server: return JWT token + user info
   - Client: retrieve private key from IndexedDB

3. Authenticated Requests:
   - Client: send JWT in Authorization header
   - Server: verify JWT signature and expiration
   - Server: process request
```

### 4. Threat Model & Mitigations

| Threat | Mitigation |
|--------|-----------|
| Man-in-the-Middle | HTTPS/WSS for all communications |
| Server Compromise | E2EE - server cannot read messages |
| Client Compromise | Private key encrypted at rest |
| Replay Attacks | Timestamp + nonce in messages |
| Brute Force Login | Rate limiting + account lockout |
| XSS Attacks | Content Security Policy, input sanitization |
| SQL Injection | Parameterized queries, ORM |
| CSRF | CSRF tokens, SameSite cookies |

## Scalability Considerations

### Horizontal Scaling
- **Stateless API servers**: Scale behind load balancer
- **WebSocket servers**: Use Redis pub/sub for cross-server messaging
- **Database**: Read replicas for message history queries
- **Redis**: Cluster mode for distributed caching

### Performance Optimizations
- **Message pagination**: Load messages in chunks
- **Lazy loading**: Contacts and conversations on demand
- **Caching**: User profiles and public keys in Redis
- **Compression**: Gzip for API responses
- **CDN**: Static assets served from CDN

## Monitoring & Observability

### Metrics to Track
- Message delivery latency
- WebSocket connection count
- API response times
- Database query performance
- Error rates by endpoint
- Active users (concurrent connections)

### Logging Strategy
- Application logs (info, warning, error)
- Access logs (HTTP requests)
- Security events (failed logins, suspicious activity)
- Performance logs (slow queries)

**Note**: Never log sensitive data (passwords, private keys, decrypted messages)

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Internet                                │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                Load Balancer (HTTPS/WSS)                     │
└────────┬──────────────────────────┬─────────────────────────┘
         │                          │
┌────────▼────────┐        ┌───────▼─────────┐
│  Web Server 1   │        │  Web Server 2   │
│  (Static React) │        │  (Static React) │
└─────────────────┘        └─────────────────┘

┌────────▼────────┐        ┌───────▼─────────┐
│  API Server 1   │◄──────►│  API Server 2   │
│  (Node.js)      │  Redis │  (Node.js)      │
└────────┬────────┘ Pub/Sub└───────┬─────────┘
         │                          │
         └─────────┬────────────────┘
                   │
         ┌─────────▼─────────┐
         │   PostgreSQL      │
         │   (Primary)       │
         └─────────┬─────────┘
                   │
         ┌─────────▼─────────┐
         │   PostgreSQL      │
         │   (Replica)       │
         └───────────────────┘
```

## Technology Choices Rationale

### Why React?
- Component-based architecture
- Large ecosystem
- Good performance with virtual DOM
- Strong community support

### Why Node.js/Express?
- JavaScript full-stack (same language)
- Non-blocking I/O (good for WebSockets)
- Mature ecosystem
- Easy integration with Socket.io

### Why PostgreSQL?
- ACID compliance for message integrity
- Complex queries (message history, search)
- JSON support for flexible data
- Proven reliability

### Why Redis?
- Fast in-memory caching
- Pub/sub for WebSocket scaling
- Session storage
- Rate limiting

### Why Web Crypto API?
- Native browser support
- Hardware acceleration
- Secure random number generation
- No external dependencies for basic crypto

## Next Steps

1. Set up development environment
2. Initialize React + Vite project
3. Initialize Node.js + Express server
4. Set up PostgreSQL database
5. Implement basic authentication
6. Build core messaging without encryption
7. Add encryption layer
8. Polish UI/UX
9. Add advanced features
