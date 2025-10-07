# SecureDove - E2EE Messaging App

A secure messaging application with end-to-end encryption (E2EE) built with React (client) and Node.js (server).

## Project Overview

SecureDove is a zero-knowledge messaging application that ensures private communication through end-to-end encryption. Messages are encrypted on the sender's device and can only be decrypted by the intended recipient. The server never has access to plaintext messages or private keys.

## Project Status

### ✅ Completed
- **Frontend UI**: React + Vite interface with chat components
- **Backend Server**: Node.js + Express + SQLite (fully implemented)
  - 17 API endpoints operational
  - JWT authentication with bcrypt
  - Complete database schema with indexes
  - Rate limiting and security headers
  - Comprehensive API documentation

### 🚧 Next Phase
- **Client-side Cryptography**: Implementing Web Crypto API for key generation and encryption

## Architecture

### Client-Server Architecture
```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Client A      │◄───────►│   Server        │◄───────►│   Client B      │
│   (React Web)   │         │   (Node.js)     │         │   (React Web)   │
│                 │         │                 │         │                 │
│  - Encryption   │         │  - Routing      │         │  - Decryption   │
│  - Key Gen      │         │  - Storage      │         │  - Key Gen      │
│  - UI/UX        │         │  - Auth         │         │  - UI/UX        │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation & Running

#### Server Setup
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Initialize database
npm run init-db

# Start server
npm run dev  # Development with auto-restart
# OR
npm start    # Production mode
```

Server runs at: `http://localhost:3000`

#### Client Setup
```bash
# Navigate to client directory (in a new terminal)
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

Client runs at: `http://localhost:5173`
   # Terminal 1 - Server
   cd server
   npm start
   
   # Terminal 2 - Client  
   cd client
   npm run dev
   ```

4. Open browser to `http://localhost:5173` and start messaging!

## Tech Stack

### Client (Frontend)
- **Framework**: React 18+
- **UI Library**: Material-UI or Tailwind CSS
- **State Management**: Redux Toolkit or Zustand
- **Encryption**: Web Crypto API + libsodium.js (for additional crypto operations)
- **WebSocket Client**: Socket.io-client
- **HTTP Client**: Axios

### Server (Backend)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite3 (local file-based database)
- **WebSocket**: Socket.io
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs

## Key Features

### Core Features
1. **User Authentication**
   - Sign up / Sign in
   - JWT-based authentication
   - Secure password hashing (bcrypt)

2. **End-to-End Encryption**
   - Public/Private key pair generation (RSA or Curve25519)
   - Message encryption using recipient's public key
   - Message decryption using private key (stored locally)
   - Key exchange protocol

3. **Real-time Messaging**
   - One-on-one chat
   - Message delivery status (sent, delivered, read)
   - Real-time updates via WebSockets

4. **User Management**
   - User profiles
   - Contact list
   - Search for users

### Security Features
- Private keys never leave the client device
- Server cannot decrypt messages
- Perfect forward secrecy (optional: Signal Protocol)
- Message integrity verification

## Project Structure

### Client Structure
```
client/
├── public/
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── Chat/
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── MessageList.jsx
│   │   │   ├── MessageInput.jsx
│   │   │   └── ContactList.jsx
│   │   └── Layout/
│   │       ├── Header.jsx
│   │       └── Sidebar.jsx
│   ├── services/
│   │   ├── api.js
│   │   ├── encryption.js
│   │   ├── websocket.js
│   │   └── keyManager.js
│   ├── store/
│   │   ├── authSlice.js
│   │   ├── chatSlice.js
│   │   └── store.js
│   ├── utils/
│   │   ├── crypto.js
│   │   └── helpers.js
│   ├── App.jsx
│   └── main.jsx
├── package.json
└── vite.config.js
```

### Server Structure
```
server/
├── src/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   └── messageController.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Message.js
│   │   └── PublicKey.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   └── messages.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── services/
│   │   ├── messageService.js
│   │   └── userService.js
│   ├── socket/
│   │   └── socketHandler.js
│   ├── config/
│   │   ├── database.js
│   │   └── redis.js
│   └── server.js
├── package.json
└── .env
```

## Database Schema (SQLite)

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  public_key TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Messages Table
```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  recipient_id INTEGER NOT NULL,
  content TEXT NOT NULL, -- Encrypted content
  sender_public_key TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id)
);
```

### Contacts Table
```sql
CREATE TABLE contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  contact_username TEXT NOT NULL,
  contact_id INTEGER,
  nickname TEXT,
  public_key TEXT,
  is_blocked INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (contact_id) REFERENCES users(id)
);
```

## Encryption Flow

### Key Generation (Client)
1. Generate RSA or Curve25519 key pair on first login
2. Store private key in browser's IndexedDB (encrypted with user's password)
3. Send public key to server for storage

### Message Encryption (Sender)
1. Generate random AES-256 symmetric key
2. Encrypt message with AES symmetric key
3. Encrypt AES key with recipient's public key (RSA/ECDH)
4. Send encrypted message + encrypted key to server

### Message Decryption (Recipient)
1. Receive encrypted message + encrypted key from server
2. Decrypt AES key using private key
3. Decrypt message using AES key
4. Display plaintext message

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/refresh` - Refresh JWT token

### Users
- `GET /api/users/profile` - Get user profile
- `GET /api/users/search?q=username` - Search users
- `GET /api/users/:id/public-key` - Get user's public key
- `POST /api/users/contacts` - Add contact

### Messages
- `GET /api/messages/:userId` - Get message history with user
- `POST /api/messages/send` - Send encrypted message
- `PUT /api/messages/:id/read` - Mark message as read

### WebSocket Events
- `connect` - Establish connection
- `message:send` - Send real-time message
- `message:receive` - Receive real-time message
- `typing` - Typing indicator
- `online` - User online status

## Development Phases

### Phase 1: Foundation
- Set up project structure
- Basic authentication (register/login)
- Database schema and models
- JWT implementation

### Phase 2: Core Messaging
- WebSocket connection
- Basic message sending/receiving (unencrypted)
- Real-time updates
- Message history

### Phase 3: Encryption
- Key pair generation
- Public key exchange
- Message encryption/decryption
- Secure key storage

### Phase 4: UI/UX
- Chat interface
- Contact list
- Message status indicators
- Responsive design

### Phase 5: Advanced Features
- File sharing (encrypted)
- Group chat
- Message search
- Push notifications

## Security Considerations

1. **Client-Side Security**
   - Private keys never sent to server
   - Keys encrypted at rest in IndexedDB
   - Secure key derivation from password (PBKDF2/Argon2)
   - XSS protection

2. **Server-Side Security**
   - HTTPS only
   - Rate limiting
   - SQL injection prevention
   - CSRF protection
   - Input validation

3. **Authentication**
   - Secure password hashing (bcrypt/Argon2)
   - JWT with short expiration
   - Refresh token rotation
   - Account lockout after failed attempts

## Getting Started

### Prerequisites
- Node.js 16+ installed
- npm

### Installation

#### Automatic Setup (Windows)
Simply run the batch script:
```bash
start.bat
```

#### Manual Setup

1. **Install Server Dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Install Client Dependencies:**
   ```bash
   cd ../client
   npm install
   ```

### Running the Application

#### Option 1: Batch Script (Windows)
```bash
start.bat
```

#### Option 2: Manual Startup

1. **Terminal 1 - Start Server:**
   ```bash
   cd server
   npm start
   ```

2. **Terminal 2 - Start Client:**
   ```bash
   cd client
   npm run dev
   ```

### Usage

1. Open browser to `http://localhost:5173`
2. Register a new account (RSA key pair generated automatically)
3. Login with your credentials
4. Add contacts and start secure messaging!

The application will be available at:
- **Client:** http://localhost:5173
- **Server API:** http://localhost:8000

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/verify` - Verify token

### User Endpoints
- `GET /api/users/profile` - Get user profile
- `GET /api/users/search?q=username` - Search users
- `GET /api/users/:id/public-key` - Get user's public key

### Message Endpoints
- `GET /api/messages/:userId` - Get message history with user
- `POST /api/messages/send` - Send encrypted message
- `PUT /api/messages/:id/read` - Mark message as read
- `GET /api/messages/unread/count` - Get unread message count

### Contact Endpoints
- `GET /api/contacts` - Get user's contacts
- `POST /api/contacts` - Add contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Remove contact

### WebSocket Events
- `authenticate` - Authenticate socket connection
- `message:send` - Send real-time message
- `message:receive` - Receive real-time message
- `typing:start/stop` - Typing indicators
- `user_online/offline` - User presence

## Future Enhancements
- Mobile apps (React Native)
- Video/Voice calls (WebRTC)
- Group messaging
- Message deletion with proof of deletion
- Disappearing messages
- Backup and restore (encrypted)
- Multi-device synchronization

## License
MIT

## Contributing
Pull requests are welcome. For major changes, please open an issue first.
