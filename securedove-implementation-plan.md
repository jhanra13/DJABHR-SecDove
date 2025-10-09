# SecureDove E2EE Messaging App - Implementation Plan

## Project Overview

**Frontend**: Vite + React  
**Backend**: Node.js + Express  
**Database**: SQLite  
**Cryptography**: Web Crypto API (client), Node.js crypto (server - hashing only)

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  public_key TEXT NOT NULL,
  salt TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_users_username ON users(username);
```

### Contacts Table
```sql
CREATE TABLE contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  contact_user_id INTEGER NOT NULL,
  contact_username TEXT NOT NULL,
  added_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, contact_user_id)
);

CREATE INDEX idx_contacts_user_id ON contacts(user_id);
```

### Conversations Table
```sql
CREATE TABLE conversations (
  id INTEGER NOT NULL,
  content_key_number INTEGER NOT NULL,
  username TEXT NOT NULL,
  encrypted_content_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (id, content_key_number, username),
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE INDEX idx_conversations_username ON conversations(username);
CREATE INDEX idx_conversations_id ON conversations(id);
```

### Messages Table
```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  content_key_number INTEGER NOT NULL,
  encrypted_msg_content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  is_deleted INTEGER DEFAULT 0,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, content_key_number);
CREATE INDEX idx_messages_created_at ON messages(created_at);
```

---

## System Architecture

### Client-Side Responsibilities
- Key pair generation (RSA-OAEP 2048-bit)
- Private key encryption/decryption using password-derived key
- Content key generation (AES-GCM 256-bit) per conversation
- Content key encryption with recipient public keys
- Message encryption/decryption with content keys
- Session management with private key in memory

### Server-Side Responsibilities
- User authentication (password hashing with bcrypt)
- Encrypted data storage
- API endpoints for CRUD operations
- No access to plaintext messages or private keys
- No cryptographic operations except password hashing

---

## Implementation Phases

## Phase 1: Backend Setup

### 1.1 Database Initialization
- Initialize SQLite database
- Create all tables with proper indexes
- Set up foreign key constraints
- Implement database connection pooling

### 1.2 Authentication System
- Implement bcrypt password hashing (cost factor: 12)
- Create JWT token generation for session management
- Implement authentication middleware
- Set up rate limiting for login attempts

### 1.3 Core API Endpoints

#### User Management
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/user
- POST /api/auth/logout

#### Contacts Management
- POST /api/contacts
- GET /api/contacts
- DELETE /api/contacts/:contactId
- GET /api/contacts/:username/public-key

#### Conversations Management
- POST /api/conversations
- GET /api/conversations
- GET /api/conversations/:conversationId
- DELETE /api/conversations/:conversationId

#### Messages Management
- POST /api/messages
- GET /api/messages/:conversationId
- PUT /api/messages/:messageId
- DELETE /api/messages/:messageId
- GET /api/messages/recent

---

## Phase 2: Client-Side Cryptography

### 2.1 Key Management Module

#### Key Generation
- Generate RSA-OAEP key pair (2048-bit modulus, SHA-256 hash)
- Generate random salt (16 bytes) using crypto.getRandomValues
- Export public key to SPKI format
- Export private key to PKCS8 format

#### Password-Derived Key
- Use PBKDF2 with SHA-256
- Iteration count: 100,000
- Key length: 256 bits
- Salt: unique per user (stored in database)
- Derive AES-GCM key for private key encryption

#### Private Key Encryption
- Encrypt private key with password-derived AES-GCM key
- Generate unique IV (12 bytes) per encryption
- Prepend IV to ciphertext for storage
- Store encrypted private key on server

#### Private Key Decryption (Login)
- Derive same AES-GCM key from password and salt
- Extract IV from encrypted private key blob
- Decrypt private key
- Import as CryptoKey object (extractable: false)
- Store in memory (window.currentSession)

### 2.2 Content Key Management

#### Content Key Generation
- Generate AES-GCM 256-bit key per conversation
- Content key is symmetric (same for all participants)
- Export to raw format for encryption with public keys

#### Content Key Distribution
- For each participant in conversation:
  - Fetch participant's RSA public key
  - Encrypt content key with RSA-OAEP
  - Store in conversations table with participant's username
- Assign content_key_number (starts at 1, increments on rotation)

#### Content Key Retrieval
- Query conversations table with username and conversation_id
- Get encrypted_content_key for current user
- Decrypt with user's RSA private key (from memory)
- Import as AES-GCM key for message encryption/decryption

#### Content Key Rotation
- Generate new content key
- Increment content_key_number
- Re-encrypt for all participants
- Insert new rows in conversations table
- New messages use new content_key_number

### 2.3 Message Encryption/Decryption

#### Message Structure Before Encryption
```javascript
{
  sender: "username",
  timestamp: 1234567890,
  content: "plain text message"
}
```

#### Encryption Process
- Serialize message object to JSON string
- Generate unique IV (12 bytes)
- Encrypt with conversation's content key (AES-GCM)
- Prepend IV to ciphertext
- Convert to hex string for storage

#### Decryption Process
- Convert hex string to ArrayBuffer
- Extract IV (first 12 bytes)
- Extract ciphertext (remaining bytes)
- Decrypt with content key
- Parse JSON to message object
- Validate structure and sanitize content

---

## Phase 3: Client-Side Implementation

### 3.1 Authentication Flow

#### Registration
1. User enters username and password
2. Generate salt using crypto.getRandomValues(16)
3. Derive password key using PBKDF2
4. Generate RSA key pair
5. Export and encrypt private key with password key
6. Export public key
7. POST to /api/auth/register with:
   - username
   - password (sent over HTTPS, hashed by server)
   - public_key (hex string)
   - salt (hex string)
   - encrypted_private_key (hex string)
8. Auto-login after successful registration

#### Login
1. User enters username and password
2. POST to /api/auth/login (server validates password)
3. Receive JWT token and user data
4. Derive password key from password and salt
5. Decrypt private key
6. Import private key as CryptoKey
7. Store in currentSession object:
   ```javascript
   {
     userId,
     username,
     privateKey,
     publicKey,
     token,
     loginTime
   }
   ```
8. Start session timeout timer

#### Logout
1. Clear currentSession object
2. Clear JWT token
3. Clear any cached content keys
4. Redirect to login page

### 3.2 Contact Management

#### Adding Contact
1. User enters contact username
2. GET /api/contacts/:username/public-key to verify user exists
3. POST /api/contacts with contact_user_id
4. Add to local contacts list

#### Displaying Contacts
1. GET /api/contacts on app load
2. Display list of contacts with usernames
3. Enable conversation creation with contacts

### 3.3 Conversation Flow

#### Creating Conversation
1. User selects one or more contacts
2. Generate unique conversation ID (timestamp + random)
3. Generate content key (AES-GCM 256-bit)
4. For each participant (including self):
   - Fetch public key
   - Encrypt content key with public key
   - Prepare conversation entry
5. POST /api/conversations with array of entries:
   ```javascript
   [
     {
       id: conversationId,
       content_key_number: 1,
       username: "participant1",
       encrypted_content_key: "hex..."
     },
     ...
   ]
   ```
6. Cache decrypted content key locally:
   ```javascript
   contentKeyCache[conversationId] = {
     keyNumber: 1,
     key: CryptoKey
   }
   ```

#### Loading Conversations
1. GET /api/conversations (returns all user's conversation entries)
2. Group by conversation_id
3. For each conversation:
   - Find entry where username matches current user
   - Decrypt content key with private key
   - Cache content key with conversation_id
   - Store content_key_number for message filtering
4. Sort conversations by last message timestamp

### 3.4 Messaging Flow

#### Sending Message
1. User types message in conversation
2. Create message object:
   ```javascript
   {
     sender: currentSession.username,
     timestamp: Date.now(),
     content: messageText
   }
   ```
3. Serialize to JSON string
4. Retrieve content key from cache
5. Encrypt with content key
6. POST /api/messages with:
   ```javascript
   {
     conversation_id: conversationId,
     content_key_number: currentKeyNumber,
     encrypted_msg_content: encryptedHex
   }
   ```
7. On success, append to local message list

#### Receiving Messages
1. GET /api/messages/:conversationId
2. Filter by content_key_number (match current key)
3. For each encrypted message:
   - Retrieve content key from cache
   - Decrypt encrypted_msg_content
   - Parse JSON to message object
   - Validate sender and timestamp
4. Sort by timestamp (ascending)
5. Display in chat view with sender name and time

#### Message Updates
1. User edits message
2. Create new message object with updated content
3. Encrypt with same content key
4. PUT /api/messages/:messageId with:
   ```javascript
   {
     encrypted_msg_content: newEncryptedHex,
     updated_at: Date.now()
   }
   ```
5. Update local message list

#### Message Deletion
1. User deletes message
2. DELETE /api/messages/:messageId
3. Server sets is_deleted flag
4. Remove from local message list

### 3.5 Real-Time Updates
1. Implement WebSocket connection or polling
2. Subscribe to conversation updates
3. On new message notification:
   - Fetch new message
   - Decrypt and display
4. On message update/delete:
   - Update local state accordingly

---

## Phase 4: Security Implementation

### 4.1 Client-Side Security

#### Session Management
- Store private key only in memory (never localStorage)
- Implement session timeout (30 minutes inactivity)
- Clear all keys on logout
- Auto-logout on browser close

#### Input Validation
- Sanitize all user inputs before encryption
- Validate message structure after decryption
- Prevent XSS in rendered messages
- Limit message size (e.g., 10KB)

#### Error Handling
- Never expose cryptographic errors to user
- Log errors securely without sensitive data
- Graceful degradation on crypto failures
- Clear guidance for user on authentication failures

### 4.2 Server-Side Security

#### Authentication
- Use bcrypt with cost factor 12 for password hashing
- Implement JWT with expiration (24 hours)
- Require HTTPS in production
- Rate limit login attempts (5 attempts per 15 minutes)

#### API Security
- Validate JWT on all protected endpoints
- Sanitize all database inputs
- Use parameterized queries (prevent SQL injection)
- Implement CORS properly
- Add helmet.js for security headers

#### Data Protection
- Never log encrypted keys or messages
- Implement database encryption at rest
- Regular security audits
- Backup encrypted database only

---

## Phase 5: Optimization

### 5.1 Performance Optimization

#### Key Caching
- Cache decrypted content keys in memory during session
- Invalidate cache on key rotation
- Limit cache size (e.g., 50 conversations)
- Use LRU eviction policy

#### Message Loading
- Implement pagination (50 messages per page)
- Load recent messages first
- Lazy load older messages on scroll
- Cache decrypted messages in memory

#### Batch Operations
- Batch decrypt messages in Web Workers
- Use Promise.all for parallel decryption
- Implement message queue for sending
- Debounce encryption operations

### 5.2 Database Optimization
- Use prepared statements
- Implement connection pooling
- Add indexes on frequently queried columns
- Implement soft deletes for messages
- Periodic cleanup of old deleted messages

### 5.3 Network Optimization
- Compress API responses (gzip)
- Implement message pagination
- Use WebSocket for real-time updates
- Cache conversation metadata
- Minimize API calls with local state

---

## Phase 6: Testing Strategy

### 6.1 Unit Tests

#### Cryptography Functions
- Key generation produces valid keys
- Password derivation is deterministic
- Encryption/decryption round-trip succeeds
- IV uniqueness verification
- Content key encryption for multiple recipients

#### API Endpoints
- Authentication flow (register, login, logout)
- CRUD operations for all resources
- Error handling for invalid inputs
- Rate limiting enforcement
- JWT validation

### 6.2 Integration Tests

#### End-to-End Messaging
- User A sends message to User B
- User B receives and decrypts correctly
- Message content matches
- Timestamp accuracy
- Multi-participant conversations

#### Key Rotation
- Generate new content key
- All participants can decrypt
- Old messages use old key
- New messages use new key

#### Session Management
- Login persists until logout/timeout
- Private key not exposed in storage
- Session cleared on logout

### 6.3 Security Tests

#### Cryptographic Security
- Server cannot decrypt messages
- Different users cannot decrypt each other's keys
- Content keys are unique per conversation
- Private keys are properly encrypted

#### Authentication Security
- Password hashing is irreversible
- JWT tokens expire properly
- Invalid tokens rejected
- Rate limiting prevents brute force

---

## Phase 7: Deployment

### 7.1 Production Build

#### Frontend
- Build React app with Vite
- Enable production mode
- Minify and bundle code
- Configure environment variables
- Set up HTTPS redirect

#### Backend
- Set NODE_ENV=production
- Configure production database path
- Enable compression middleware
- Set secure JWT secret
- Configure CORS for production domain

### 7.2 Environment Configuration

#### Required Environment Variables
```
# Server
PORT=3000
JWT_SECRET=<strong-random-secret>
NODE_ENV=production
DB_PATH=/path/to/production.db
CORS_ORIGIN=https://securedove.com

# Client
VITE_API_URL=https://api.securedove.com
```

### 7.3 Monitoring
- Log authentication attempts
- Monitor failed decryption attempts
- Track API response times
- Alert on unusual patterns
- Regular backup verification

---

## Implementation Timeline

### Week 1: Backend Foundation
- Database schema implementation
- Authentication system
- User and contact APIs

### Week 2: Backend Messaging
- Conversation APIs
- Message CRUD operations
- Database optimization

### Week 3: Client Cryptography
- Key management module
- Content key system
- Message encryption/decryption

### Week 4: Client UI Integration
- Authentication UI
- Contact management UI
- Conversation creation

### Week 5: Messaging UI
- Message sending/receiving
- Real-time updates
- Message editing/deletion

### Week 6: Testing & Security
- Unit tests
- Integration tests
- Security audit
- Performance optimization

### Week 7: Deployment & Documentation
- Production deployment
- User documentation
- Developer documentation
- Monitoring setup

---

## Critical Security Considerations

### Never Do
- Store private keys unencrypted
- Send private keys to server
- Reuse IVs in encryption
- Log sensitive cryptographic material
- Trust client-side validation alone
- Store decrypted content keys in localStorage

### Always Do
- Use HTTPS in production
- Validate all inputs on server
- Clear keys from memory on logout
- Use high iteration counts for PBKDF2
- Generate unique IVs per encryption
- Implement proper error handling
- Regular security audits

---

## Success Metrics

### Security
- Zero plaintext data on server
- No private key exposure
- Successful penetration testing
- No XSS vulnerabilities

### Performance
- Message encryption < 100ms
- Message decryption < 50ms
- Page load < 2 seconds
- Real-time message delivery < 1 second

### Usability
- Successful registration < 30 seconds
- Message send success rate > 99%
- Zero data loss
- Clear error messages

---

## Future Enhancements

### Phase 8: Advanced Features
- File sharing with encryption
- Voice/video calls with E2EE
- Message read receipts
- Typing indicators
- Group conversation management
- Content key rotation automation
- Desktop application with Electron
- Mobile applications
- Backup and recovery system
- Multi-device synchronization

### Phase 9: Scalability
- Migrate to PostgreSQL
- Implement message retention policies
- Add message search (encrypted)
- Implement user blocking
- Add report functionality
- Admin moderation tools (metadata only)