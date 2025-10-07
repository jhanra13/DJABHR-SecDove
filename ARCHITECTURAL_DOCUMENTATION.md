# SecureDove E2EE Messaging App - Architectural Documentation

## Table of Contents
1. [Architectural Overview](#architectural-overview)
2. [Design Patterns Applied](#design-patterns-applied)
3. [Brief Component Diagram](#brief-component-diagram)
4. [Elaborated Component Diagrams](#elaborated-component-diagrams)
5. [Installation & Configuration](#installation--configuration)
6. [Usage Instructions](#usage-instructions)

---

## Architectural Overview

SecureDove follows a **three-tier client-server architecture** with end-to-end encryption, implementing multiple design patterns to ensure security, maintainability, and scalability.

### System Architecture

```mermaid
graph TB
    subgraph "Client Tier (React)"
        UI[User Interface Components]
        CTX[Context Providers]
        CRYPTO[Cryptography Layer]
        API_CLIENT[API Client]
    end
    
    subgraph "Network Layer"
        HTTP[HTTP/HTTPS]
        WS[WebSocket/Socket.IO]
    end
    
    subgraph "Server Tier (Node.js)"
        EXPRESS[Express.js Server]
        MW[Middleware Layer]
        ROUTES[Route Handlers]
        IO[Socket.IO Server]
    end
    
    subgraph "Data Tier"
        SQLITE[SQLite Database]
        FS[File System]
    end
    
    UI --> CTX
    CTX --> CRYPTO
    CTX --> API_CLIENT
    
    API_CLIENT --> HTTP
    CTX --> WS
    
    HTTP --> EXPRESS
    WS --> IO
    
    EXPRESS --> MW
    MW --> ROUTES
    
    ROUTES --> SQLITE
    EXPRESS --> FS
    
    style UI fill:#e1f5fe
    style CTX fill:#f3e5f5
    style CRYPTO fill:#fff3e0
    style EXPRESS fill:#e8f5e8
    style SQLITE fill:#fce4ec
```

---

## Design Patterns Applied

### 1. **Context Pattern (React)**
- **Pattern**: Provider Pattern with React Context API
- **Usage**: State management and dependency injection across components
- **Implementation**: 6 context providers managing different concerns

### 2. **Repository Pattern**
- **Pattern**: Data Access Layer abstraction
- **Usage**: Database operations abstracted through helper functions
- **Implementation**: `config/database.js` provides consistent DB interface

### 3. **Middleware Pattern**
- **Pattern**: Chain of Responsibility for request processing
- **Usage**: Authentication, rate limiting, error handling
- **Implementation**: Express.js middleware stack

### 4. **Observer Pattern**
- **Pattern**: Event-driven communication
- **Usage**: Real-time messaging via WebSocket events
- **Implementation**: Socket.IO event system

### 5. **Strategy Pattern**
- **Pattern**: Interchangeable encryption algorithms
- **Usage**: Different cryptographic operations (RSA, AES-GCM, PBKDF2)
- **Implementation**: Modular crypto functions in `utils/crypto.js`

### 6. **MVC Architecture (Modified)**
- **Model**: Context providers and API layer
- **View**: React components
- **Controller**: Context providers + Route handlers

---

## Brief Component Diagram

### High-Level System Components

```mermaid
graph TB
    subgraph "Client Application"
        AUTH[Authentication System]
        CONTACTS[Contact Management]
        CONV[Conversation Management]
        MSG[Message System]
        UI_COMP[UI Components]
        WS_CLIENT[WebSocket Client]
    end
    
    subgraph "Server Application"
        AUTH_API[Authentication API]
        CONTACTS_API[Contacts API]
        CONV_API[Conversations API]
        MSG_API[Messages API]
        WS_SERVER[WebSocket Server]
        DB_LAYER[Database Layer]
    end
    
    subgraph "External Systems"
        SQLITE_DB[SQLite Database]
        CRYPTO_API[Web Crypto API]
    end
    
    AUTH --> AUTH_API
    CONTACTS --> CONTACTS_API
    CONV --> CONV_API
    MSG --> MSG_API
    WS_CLIENT --> WS_SERVER
    
    AUTH_API --> DB_LAYER
    CONTACTS_API --> DB_LAYER
    CONV_API --> DB_LAYER
    MSG_API --> DB_LAYER
    
    DB_LAYER --> SQLITE_DB
    AUTH --> CRYPTO_API
    MSG --> CRYPTO_API
    
    UI_COMP --> AUTH
    UI_COMP --> CONTACTS
    UI_COMP --> CONV
    UI_COMP --> MSG
    
    style AUTH fill:#ffeb3b
    style CONTACTS fill:#4caf50
    style CONV fill:#2196f3
    style MSG fill:#ff5722
    style UI_COMP fill:#9c27b0
```

---

## Elaborated Component Diagrams

### 1. Client-Side Architecture - Context Layer

```mermaid
classDiagram
    class AuthContext {
        -currentSession: Object
        -loading: Boolean
        -error: String
        +register(userData): Promise
        +login(credentials): Promise
        +logout(): void
        +checkSession(): Promise
        +useAuth(): Hook
        <<Context Provider>>
    }
    
    class ContactsContext {
        -contacts: Array
        -loading: Boolean
        -error: String
        +loadContacts(): Promise
        +addContact(username): Promise
        +removeContact(contactId): Promise
        +getContactByUsername(username): Object
        +isContact(username): Boolean
        +useContacts(): Hook
        <<Context Provider>>
    }
    
    class ConversationsContext {
        -conversations: Array
        -contentKeyCache: Map
        -loading: Boolean
        -error: String
        +loadConversations(): Promise
        +createConversation(participants): Promise
        +getContentKey(conversationId): CryptoKey
        +deleteConversation(conversationId): Promise
        +useConversations(): Hook
        <<Context Provider>>
    }
    
    class MessagesContext {
        -messages: Map
        -activeConversation: String
        -loading: Boolean
        -error: String
        +loadMessages(conversationId): Promise
        +sendMessage(conversationId, content): Promise
        +updateMessage(messageId, content): Promise
        +deleteMessage(messageId): Promise
        +getMessages(conversationId): Array
        +useMessages(): Hook
        <<Context Provider>>
    }
    
    class WebSocketContext {
        -connected: Boolean
        -socket: Socket
        +on(event, handler): void
        +off(event, handler): void
        +emit(event, data): void
        +joinConversation(conversationId): void
        +leaveConversation(conversationId): void
        +useWebSocket(): Hook
        <<Context Provider>>
    }
    
    class ViewContext {
        -currentView: String
        -selectedConversation: String
        +switchView(view): void
        +selectConversation(conversationId): void
        +clearConversation(): void
        +useViewContext(): Hook
        <<Context Provider>>
    }
    
    AuthContext --|> ContactsContext : provides session
    AuthContext --|> ConversationsContext : provides keys
    AuthContext --|> MessagesContext : provides session
    ConversationsContext --|> MessagesContext : provides content keys
    WebSocketContext --|> MessagesContext : provides real-time updates
    ViewContext --|> UI : navigation state
```

### 2. Client-Side Architecture - UI Components

```mermaid
classDiagram
    class AppContainer {
        -activeDiscussion: Object
        -showAddContact: Boolean
        -showNewConversation: Boolean
        +handleConversationCreated(conversation): void
        +renderView(): ReactElement
        <<Main Layout>>
    }
    
    class ChatWindow {
        -discussion: Object
        -messages: Array
        +sendMessage: Function
        +onNewConversation: Function
        <<Chat Interface>>
    }
    
    class MessagesArea {
        -messages: Array
        -loading: Boolean
        -error: String
        +scrollToBottom(): void
        <<Message Display>>
    }
    
    class ChatFooter {
        -message: String
        -sending: Boolean
        +handleSubmit(event): Promise
        +handleKeyPress(event): void
        <<Message Input>>
    }
    
    class ContactsView {
        -searchQuery: String
        +handleAddContact(username): Promise
        +handleDeleteContact(contactId): Promise
        +handleBlockContact(contactId): Promise
        <<Contact Management>>
    }
    
    class DiscussionsList {
        -activeDiscussion: Object
        +onDiscussionSelect: Function
        +onAddContact: Function
        <<Conversation List>>
    }
    
    class Sidebar {
        +switchToDiscussions(): void
        +switchToContacts(): void
        +switchToSettings(): void
        +handleLogout(): void
        <<Navigation>>
    }
    
    AppContainer --> ChatWindow : renders
    AppContainer --> ContactsView : renders
    AppContainer --> DiscussionsList : renders
    AppContainer --> Sidebar : renders
    
    ChatWindow --> MessagesArea : contains
    ChatWindow --> ChatFooter : contains
    
    AppContainer ..> AuthContext : uses
    AppContainer ..> MessagesContext : uses
    AppContainer ..> ViewContext : uses
    ContactsView ..> ContactsContext : uses
    ChatFooter ..> MessagesContext : uses
    DiscussionsList ..> ConversationsContext : uses
```

### 3. Server-Side Architecture - API Layer

```mermaid
classDiagram
    class ExpressServer {
        -app: Express
        -httpServer: HttpServer
        -io: SocketIO
        +startServer(): Promise
        +configureMiddleware(): void
        +configureRoutes(): void
        +configureWebSocket(): void
        <<Main Server>>
    }
    
    class AuthRoutes {
        +register(req, res): Promise
        +login(req, res): Promise
        +getUser(req, res): Promise
        +logout(req, res): Promise
        +checkUsername(req, res): Promise
        <<Authentication API>>
    }
    
    class ContactsRoutes {
        +addContact(req, res): Promise
        +getContacts(req, res): Promise
        +deleteContact(req, res): Promise
        +getPublicKey(req, res): Promise
        <<Contacts API>>
    }
    
    class ConversationsRoutes {
        +createConversation(req, res): Promise
        +getConversations(req, res): Promise
        +getConversation(req, res): Promise
        +deleteConversation(req, res): Promise
        <<Conversations API>>
    }
    
    class MessagesRoutes {
        +sendMessage(req, res): Promise
        +getMessages(req, res): Promise
        +updateMessage(req, res): Promise
        +deleteMessage(req, res): Promise
        +getRecentMessages(req, res): Promise
        <<Messages API>>
    }
    
    class AuthMiddleware {
        +authenticateToken(req, res, next): void
        <<JWT Validation>>
    }
    
    class RateLimiter {
        +apiLimiter: RateLimit
        +loginLimiter: RateLimit
        <<Rate Protection>>
    }
    
    ExpressServer --> AuthRoutes : uses
    ExpressServer --> ContactsRoutes : uses
    ExpressServer --> ConversationsRoutes : uses
    ExpressServer --> MessagesRoutes : uses
    ExpressServer --> AuthMiddleware : uses
    ExpressServer --> RateLimiter : uses
    
    AuthRoutes ..> DatabaseLayer : uses
    ContactsRoutes ..> DatabaseLayer : uses
    ConversationsRoutes ..> DatabaseLayer : uses
    MessagesRoutes ..> DatabaseLayer : uses
    
    AuthRoutes ..> AuthMiddleware : protected by
    ContactsRoutes ..> AuthMiddleware : protected by
    ConversationsRoutes ..> AuthMiddleware : protected by
    MessagesRoutes ..> AuthMiddleware : protected by
```

### 4. Server-Side Architecture - Data Layer

```mermaid
classDiagram
    class DatabaseLayer {
        -db: SQLite3
        +run(sql, params): Promise
        +get(sql, params): Promise
        +all(sql, params): Promise
        <<Database Interface>>
    }
    
    class UsersTable {
        +id: INTEGER PK
        +username: TEXT UNIQUE
        +password_hash: TEXT
        +public_key: TEXT
        +salt: TEXT
        +encrypted_private_key: TEXT
        +created_at: INTEGER
        <<Users Schema>>
    }
    
    class ContactsTable {
        +id: INTEGER PK
        +user_id: INTEGER FK
        +contact_user_id: INTEGER FK
        +contact_username: TEXT
        +added_at: INTEGER
        <<Contacts Schema>>
    }
    
    class ConversationsTable {
        +id: INTEGER
        +content_key_number: INTEGER
        +username: TEXT
        +encrypted_content_key: TEXT
        +created_at: INTEGER
        <<Conversations Schema>>
    }
    
    class MessagesTable {
        +id: INTEGER PK
        +conversation_id: INTEGER FK
        +content_key_number: INTEGER
        +encrypted_msg_content: TEXT
        +created_at: INTEGER
        +updated_at: INTEGER
        +is_deleted: INTEGER
        <<Messages Schema>>
    }
    
    class DatabaseVerification {
        +verifyDatabase(): Promise
        +initializeDatabase(): Promise
        +ensureDatabaseIntegrity(): Promise
        <<Database Utils>>
    }
    
    DatabaseLayer --> UsersTable : manages
    DatabaseLayer --> ContactsTable : manages
    DatabaseLayer --> ConversationsTable : manages
    DatabaseLayer --> MessagesTable : manages
    
    DatabaseVerification --> DatabaseLayer : maintains
    
    ContactsTable --|> UsersTable : user_id FK
    ContactsTable --|> UsersTable : contact_user_id FK
    ConversationsTable --|> UsersTable : username FK
    MessagesTable --|> ConversationsTable : conversation_id FK
```

### 5. Cryptography Architecture

```mermaid
classDiagram
    class CryptoUtils {
        +generateKeyPair(): Promise~KeyPair~
        +generateSalt(): Uint8Array
        +derivePasswordKey(password, salt): Promise~CryptoKey~
        +exportPublicKey(key): Promise~String~
        +exportPrivateKey(key): Promise~String~
        +importPublicKey(keyData): Promise~CryptoKey~
        +importPrivateKey(keyData): Promise~CryptoKey~
        <<Key Management>>
    }
    
    class PrivateKeyEncryption {
        +encryptPrivateKey(privateKey, passwordKey): Promise~String~
        +decryptPrivateKey(encryptedKey, passwordKey): Promise~CryptoKey~
        <<Private Key Protection>>
    }
    
    class ContentKeyManagement {
        +generateContentKey(): Promise~CryptoKey~
        +exportContentKey(key): Promise~ArrayBuffer~
        +importContentKey(keyData): Promise~CryptoKey~
        +encryptContentKey(contentKey, publicKey): Promise~String~
        +decryptContentKey(encryptedKey, privateKey): Promise~CryptoKey~
        <<Content Key Operations>>
    }
    
    class MessageEncryption {
        +encryptMessage(messageObj, contentKey): Promise~String~
        +decryptMessage(encryptedData, contentKey): Promise~Object~
        <<Message Protection>>
    }
    
    class WebCryptoAPI {
        +generateKey(): Promise~CryptoKey~
        +encrypt(): Promise~ArrayBuffer~
        +decrypt(): Promise~ArrayBuffer~
        +deriveBits(): Promise~ArrayBuffer~
        +exportKey(): Promise~ArrayBuffer~
        +importKey(): Promise~CryptoKey~
        <<Browser Crypto API>>
    }
    
    CryptoUtils ..> WebCryptoAPI : uses
    PrivateKeyEncryption ..> WebCryptoAPI : uses
    ContentKeyManagement ..> WebCryptoAPI : uses
    MessageEncryption ..> WebCryptoAPI : uses
    
    CryptoUtils --> PrivateKeyEncryption : provides keys
    CryptoUtils --> ContentKeyManagement : provides keys
    ContentKeyManagement --> MessageEncryption : provides keys
```

### 6. WebSocket Real-time Communication

```mermaid
classDiagram
    class WebSocketServer {
        -io: SocketIO
        -connectedClients: Map
        +handleConnection(socket): void
        +handleAuthentication(socket, token): void
        +handleJoinConversation(socket, conversationId): void
        +handleLeaveConversation(socket, conversationId): void
        +handleDisconnection(socket): void
        +broadcastToRoom(room, event, data): void
        <<Server WebSocket>>
    }
    
    class WebSocketClient {
        -socket: Socket
        -connected: Boolean
        -eventHandlers: Map
        +connect(): void
        +authenticate(token): Promise
        +joinConversation(conversationId): void
        +leaveConversation(conversationId): void
        +on(event, handler): void
        +off(event, handler): void
        +emit(event, data): void
        +disconnect(): void
        <<Client WebSocket>>
    }
    
    class RealTimeEvents {
        +new-message: MessageData
        +message-updated: MessageUpdate
        +message-deleted: MessageDelete
        +user-online: UserStatus
        +user-offline: UserStatus
        +typing-start: TypingIndicator
        +typing-stop: TypingIndicator
        <<Event Definitions>>
    }
    
    class ConversationRooms {
        -rooms: Map~String, Set~
        +joinRoom(conversationId, socketId): void
        +leaveRoom(conversationId, socketId): void
        +getRoomClients(conversationId): Set
        +broadcastToRoom(conversationId, event, data): void
        <<Room Management>>
    }
    
    WebSocketServer --> ConversationRooms : manages
    WebSocketServer ..> RealTimeEvents : emits
    WebSocketClient ..> RealTimeEvents : listens
    
    WebSocketClient --> MessagesContext : updates
    WebSocketServer --> MessagesRoutes : triggered by
```

---

## Installation & Configuration

### Prerequisites
- Node.js 18+ 
- npm 9+
- Modern web browser with Web Crypto API support

### Server Setup

1. **Navigate to server directory:**
```bash
cd server
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Environment Variables:**
```env
# Server Configuration
PORT=8000
NODE_ENV=development

# JWT Secret (Generate a strong random secret for production)
JWT_SECRET=dev-secret-key-please-change-in-production

# Database
DB_PATH=./database/securedove.db

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX_REQUESTS=5
```

5. **Initialize database:**
```bash
npm run init-db
```

6. **Start server:**
```bash
npm start
# or for development with hot reload:
npm run dev
```

### Client Setup

1. **Navigate to client directory:**
```bash
cd client
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment (optional):**
```bash
# Create .env file if needed
VITE_API_URL=http://localhost:8000/api
```

4. **Start development server:**
```bash
npm run dev
```

5. **Build for production:**
```bash
npm run build
```

### Production Deployment

1. **Server Production Build:**
```bash
# Set production environment
export NODE_ENV=production
export JWT_SECRET=your-strong-production-secret
export DB_PATH=/path/to/production/database
export CORS_ORIGIN=https://your-domain.com
export PORT=3000

# Start server
npm start
```

2. **Client Production Build:**
```bash
# Set production API URL
export VITE_API_URL=https://your-api-domain.com/api

# Build
npm run build

# Serve static files (example with serve)
npx serve -s dist -l 3000
```

---

## Usage Instructions

### 1. User Registration & Authentication

#### Registration Process:
1. Open application at `http://localhost:3000`
2. Click "Sign Up" button
3. Enter desired username (3-20 characters, alphanumeric, underscore, hyphen)
4. Enter secure password (minimum 8 characters recommended)
5. Click "Register" - system will:
   - Generate RSA-2048 key pair client-side
   - Derive password-based encryption key using PBKDF2
   - Encrypt private key with password-derived key
   - Send encrypted data to server
   - Auto-login after successful registration

#### Login Process:
1. Enter username and password
2. Click "Sign In" - system will:
   - Authenticate with server
   - Retrieve user's encrypted private key and salt
   - Derive password-based key locally
   - Decrypt private key in browser memory
   - Establish encrypted session

### 2. Contact Management

#### Adding Contacts:
1. Navigate to "Contacts" view via sidebar
2. Click "Add Contact" button
3. Enter contact's username
4. Click "Add" - system will:
   - Verify user exists on server
   - Retrieve contact's public key
   - Add to contact list

#### Managing Contacts:
- **View all contacts:** Contacts tab shows all added users
- **Remove contact:** Click "Remove" button next to contact
- **Block contact:** Click "Block" button (prevents messaging)

### 3. Conversation Management

#### Creating Conversations:
1. From Discussions view, click "New Conversation"
2. Select one or more contacts from list
3. Click "Create Conversation" - system will:
   - Generate unique conversation ID
   - Create AES-256-GCM content key
   - Encrypt content key with each participant's public key
   - Store encrypted keys on server
   - Cache decrypted key locally

#### Conversation Features:
- **View conversations:** All conversations appear in left panel
- **Select conversation:** Click on conversation to view messages
- **Delete conversation:** Use conversation options menu

### 4. Messaging System

#### Sending Messages:
1. Select a conversation from the list
2. Type message in input field at bottom
3. Press Enter or click send button - system will:
   - Create message object with sender, timestamp, content
   - Encrypt message with conversation's content key
   - Send encrypted message to server
   - Display message immediately in chat
   - Broadcast to other participants via WebSocket

#### Message Features:
- **Real-time delivery:** Messages appear instantly for all participants
- **Message history:** Scroll up to load older messages
- **Message editing:** Right-click message to edit (future feature)
- **Message deletion:** Right-click to delete messages

#### Message Encryption Flow:
```
User Input → Message Object → AES Encryption → Server Storage
                ↓
Client Display ← Message Decrypt ← Real-time Broadcast ← WebSocket
```

### 5. Security Features

#### End-to-End Encryption:
- **Key Generation:** RSA-2048 key pairs generated locally
- **Private Key Protection:** Encrypted with PBKDF2-derived key
- **Content Keys:** Unique AES-256-GCM key per conversation
- **Message Encryption:** All message content encrypted before transmission

#### Session Security:
- **Memory-Only Keys:** Private keys never stored persistently
- **JWT Tokens:** 24-hour expiration with secure validation
- **Session Timeout:** Automatic logout after 30 minutes inactivity
- **Secure Storage:** Only encrypted data stored on server

#### Network Security:
- **HTTPS Required:** Production deployment uses TLS
- **Rate Limiting:** Protection against brute force attacks
- **Input Validation:** All inputs sanitized and validated
- **CORS Protection:** Configured for specific origins

### 6. Advanced Usage

#### WebSocket Connection:
- **Auto-connect:** Establishes connection on login
- **Room Management:** Joins conversation rooms automatically
- **Reconnection:** Automatic reconnection on network issues
- **Event Handling:** Real-time message delivery and updates

#### Cryptographic Operations:
- **Key Rotation:** Content keys can be rotated for forward secrecy
- **Key Verification:** Public key fingerprints for identity verification
- **Secure Deletion:** Keys cleared from memory on logout
- **Backup & Recovery:** Export/import functionality (future feature)

### 7. Troubleshooting

#### Common Issues:

**Cannot login:**
- Verify username and password
- Check network connectivity
- Clear browser cache and localStorage

**Messages not appearing:**
- Check WebSocket connection status
- Verify conversation membership
- Refresh page to reload messages

**Encryption errors:**
- Ensure browser supports Web Crypto API
- Check for blocked third-party cookies
- Verify secure context (HTTPS in production)

#### Debug Information:
Access browser developer console for detailed logging:
- Authentication events
- WebSocket connection status
- Message encryption/decryption
- Network requests

#### Performance Optimization:
- **Message Pagination:** Loads 50 messages at a time
- **Key Caching:** Content keys cached during session
- **Batch Operations:** Multiple messages processed in parallel
- **Memory Management:** Automatic cleanup on logout

---

## Security Considerations

### Client-Side Security:
- Private keys never leave browser memory
- All cryptographic operations performed locally
- Input sanitization prevents XSS attacks
- Session management with automatic timeouts

### Server-Side Security:
- Zero-knowledge architecture (no plaintext access)
- Bcrypt password hashing with high cost factor
- JWT authentication with expiration
- Rate limiting and request validation
- SQL injection prevention with parameterized queries

### Network Security:
- HTTPS required for production
- WebSocket over TLS (WSS)
- CORS configuration for specific origins
- Security headers via Helmet.js

### Data Security:
- End-to-end encryption for all messages
- Encrypted private key storage
- Secure key derivation (PBKDF2)
- Forward secrecy with key rotation capability

---

## Performance Metrics

### Target Performance:
- **Message Encryption:** < 100ms
- **Message Decryption:** < 50ms
- **Page Load:** < 2 seconds
- **Real-time Delivery:** < 1 second
- **Database Operations:** < 10ms average

### Scalability Considerations:
- SQLite suitable for moderate user bases
- WebSocket connection pooling
- Message pagination for large conversations
- Content key caching for performance
- Future: PostgreSQL migration for larger scale

---

## License

MIT License - see LICENSE file for details.

---

## Contributing

Please read CONTRIBUTING.md for development guidelines and contribution process.