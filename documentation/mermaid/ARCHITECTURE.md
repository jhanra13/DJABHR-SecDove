# SecureDove Architecture

This document summarizes the architecture and components using only information from this `documentation/` folder. It includes Mermaid versions of the PlantUML diagrams and concise supporting text based on `documentation/README.md`.

## Overview

- Patterns: Client–Server, Layered. The server uses modular routing (controller-like routes) with middleware for cross‑cutting concerns and a persistence layer. The client uses React Context/Provider with hooks; REST API wrappers and a WebSocket provider support data and realtime.
- Trust model: Zero‑knowledge server for message content and private keys. All cryptography for message payloads is client‑side.

## Architecture Brief

```mermaid
flowchart LR
  %% Styles
  classDef comp fill:#f8f9fb,stroke:#99a,stroke-width:1px
  classDef db fill:#eef7ff,stroke:#669,stroke-width:1px

  %% Client
  subgraph CLIENT[Client - React]
    subgraph UI[UI Layer]
      UIComp[UI]
    end
    subgraph CTX[Context Providers]
      AuthContext
      ContactsContext
      ConversationsContext
      MessagesContext
      WebSocketContext
      ViewContext
    end
    subgraph APIW[API Wrappers]
      AuthAPI
      ContactsAPI
      ConversationsAPI
      MessagesAPI
    end
  end

  %% Server
  subgraph SERVER[Server - Express & Socket.IO]
    subgraph ROUTES[Routes]
      AuthRoutes
      ContactsRoutes
      ConversationsRoutes
      MessagesRoutes
    end
    subgraph MW[Middleware]
      AuthMiddleware
      RateLimiter
    end
    subgraph RT[Realtime]
      RealtimeGateway
    end
    SQLite[(SQLite DB)]
  end

  %% UI to Contexts
  UIComp --> AuthContext
  UIComp --> ContactsContext
  UIComp --> ConversationsContext
  UIComp --> MessagesContext
  UIComp --> ViewContext
  UIComp --> WebSocketContext

  %% Contexts to APIs / Realtime
  AuthContext --> AuthAPI
  ContactsContext --> ContactsAPI
  ConversationsContext --> ConversationsAPI
  ConversationsContext --> ContactsAPI
  MessagesContext --> MessagesAPI
  MessagesContext --> WebSocketContext

  %% API wrappers to HTTP routes
  AuthAPI -. REST .-> AuthRoutes
  ContactsAPI -. REST .-> ContactsRoutes
  ConversationsAPI -. REST .-> ConversationsRoutes
  MessagesAPI -. REST .-> MessagesRoutes

  %% Routes to middleware and DB
  AuthRoutes --> AuthMiddleware
  AuthRoutes --> RateLimiter
  ContactsRoutes --> AuthMiddleware
  ConversationsRoutes --> AuthMiddleware
  MessagesRoutes --> AuthMiddleware

  AuthRoutes --> SQLite
  ContactsRoutes --> SQLite
  ConversationsRoutes --> SQLite
  MessagesRoutes --> SQLite

  %% Realtime interactions
  MessagesRoutes -. emit .-> RealtimeGateway
  ConversationsRoutes -. emit .-> RealtimeGateway
  WebSocketContext -. SocketIO .-> RealtimeGateway

  %% Styling
  class UIComp comp
  class AuthContext,ContactsContext,ConversationsContext,MessagesContext,WebSocketContext,ViewContext comp
  class AuthAPI,ContactsAPI,ConversationsAPI,MessagesAPI comp
  class AuthRoutes,ContactsRoutes,ConversationsRoutes,MessagesRoutes comp
  class AuthMiddleware,RateLimiter comp
  class RealtimeGateway comp
  class SQLite db
```

## Client Components (Elaborated)

```mermaid
classDiagram
  class UI

  class AuthContext {
    - currentSession
    - loading
    - error
    + register()
    + login()
    + logout()
    + checkUsernameExists()
    + isAuthenticated()
  }

  class ContactsContext {
    - contacts
    - loading
    - error
    + loadContacts()
    + addContact()
    + deleteContact()
    + getPublicKey()
  }

  class ConversationsContext {
    - conversations
    - contentKeyCache
    - loading
    - error
    + loadConversations()
    + createConversation()
    + getContentKey()
    + getConversation()
    + addParticipants()
    + leaveConversation()
    + deleteConversation()
  }

  class MessagesContext {
    - messages
    - loading
    - error
    + loadMessages()
    + sendMessage()
    + updateMessage()
    + deleteMessage()
    + clearMessages()
    + getMessages()
  }

  class WebSocketContext {
    - connected
    - socket
    + on()
    + off()
    + emit()
    + joinConversation()
    + leaveConversation()
  }

  class ViewContext {
    - currentView
    - selectedConversation
    + switchView()
    + selectConversation()
    + clearConversation()
  }

  interface IAuthAPI
  interface IContactsAPI
  interface IConversationsAPI
  interface IMessagesAPI

  IAuthAPI : + register()
  IAuthAPI : + login()
  IAuthAPI : + getUser()
  IAuthAPI : + logout()
  IAuthAPI : + checkUsername()

  IContactsAPI : + addContact()
  IContactsAPI : + getContacts()
  IContactsAPI : + deleteContact()
  IContactsAPI : + getPublicKey()

  IConversationsAPI : + createConversation()
  IConversationsAPI : + getConversations()
  IConversationsAPI : + getConversation()
  IConversationsAPI : + deleteConversation()
  IConversationsAPI : + addParticipants()

  IMessagesAPI : + sendMessage()
  IMessagesAPI : + getMessages()
  IMessagesAPI : + updateMessage()
  IMessagesAPI : + deleteMessage()
  IMessagesAPI : + getRecentMessages()

  class CryptoUtils {
    + generateKeyPair()
    + derivePasswordKey()
    + encryptPrivateKey()
    + decryptPrivateKey()
    + generateContentKey()
    + encryptContentKey()
    + decryptContentKey()
    + encryptMessage()
    + decryptMessage()
  }

  class MessageStorage {
    + getStoredMessages()
    + getStoredMetadata()
    + saveMessages()
    + saveMetadata()
    + clearAllMessages()
    + getStorageInfo()
  }

  class MessageBackup {
    + createBackup()
    + exportBackup()
    + importBackup()
    + restoreBackup()
    + createAndExportBackup()
    + importAndRestoreBackup()
  }

  UI ..> AuthContext : uses
  UI ..> ContactsContext : uses
  UI ..> ConversationsContext : uses
  UI ..> MessagesContext : uses
  UI ..> ViewContext : uses
  UI ..> WebSocketContext : uses

  AuthContext ..> IAuthAPI
  ContactsContext ..> IContactsAPI
  ConversationsContext ..> IConversationsAPI
  MessagesContext ..> IMessagesAPI

  MessagesContext ..> WebSocketContext
  AuthContext ..> CryptoUtils
  ConversationsContext ..> CryptoUtils
  MessagesContext ..> CryptoUtils
  MessageBackup ..> MessageStorage
```

## Server Components (Elaborated)

```mermaid
classDiagram
  class AuthRoutes {
    + post_auth_register()
    + post_auth_login()
    + get_auth_user()
    + post_auth_logout()
    + get_check_username()
  }

  class ContactsRoutes {
    + post_contacts()
    + get_contacts()
    + delete_contacts_byId()
    + get_contacts_public_key()
  }

  class ConversationsRoutes {
    + post_conversations()
    + get_conversations()
    + get_conversations_byId()
    + post_conversations_add_participants()
    + delete_conversations_byId()
  }

  class MessagesRoutes {
    + post_messages()
    + get_messages_byConversation()
    + put_messages_byId()
    + delete_messages_byId()
    + get_messages_recent_all()
  }

  class AuthMiddleware {
    + authenticateToken(req,res,next)
  }

  class RateLimiter {
    + apiLimiter
    + loginLimiter
  }

  class AuthService {
    + hashPassword(plain)
    + verifyPassword(plain, hash)
    + generateToken(userId, username)
    + verifyToken(token)
  }

  class RealtimeGateway {
    + onAuthenticate()
    + onJoinConversation()
    + onLeaveConversation()
    + emitNewMessage()
    + emitMessageUpdated()
    + emitMessageDeleted()
    + emitConversationCreated()
    + emitConversationUpdated()
    + emitParticipantsAdded()
    + emitParticipantsRemoved()
    + emitKeyRotated()
  }

  class Database {
    + run(sql, params): Result
    + get(sql, params): Row
    + all(sql, params): Rows
    + tables
  }

  class DBVerifyService {
    + ensureDatabaseIntegrity()
  }

  class EnvConfig {
    + getEnv(key, defaultValue)
  }

  AuthRoutes ..> AuthMiddleware
  ContactsRoutes ..> AuthMiddleware
  ConversationsRoutes ..> AuthMiddleware
  MessagesRoutes ..> AuthMiddleware

  AuthRoutes ..> RateLimiter
  MessagesRoutes ..> RealtimeGateway : emit
  ConversationsRoutes ..> RealtimeGateway : emit

  AuthRoutes ..> AuthService
  AuthRoutes ..> Database
  ContactsRoutes ..> Database
  ConversationsRoutes ..> Database
  MessagesRoutes ..> Database

  DBVerifyService ..> Database
  EnvConfig ..> AuthRoutes
  EnvConfig ..> ContactsRoutes
  EnvConfig ..> ConversationsRoutes
  EnvConfig ..> MessagesRoutes
  EnvConfig ..> RealtimeGateway
  EnvConfig ..> Database
```

## User Use Cases

```mermaid
flowchart LR
  classDef actor fill:#fffce6,stroke:#b59b00,stroke-width:1px
  classDef uc fill:#f0f7ff,stroke:#678,stroke-width:1px

  User([User])
  class User actor

  subgraph AUTH[Authentication]
    U1[Register - RSA keypair; encrypt private key]
    U2[Check Username Availability]
    U3[Login - decrypt private key]
    U4[Logout]
    class U1,U2,U3,U4 uc
  end

  subgraph CONTACTS[Contacts]
    U5[Add Contact]
    U6[List Contacts]
    U7[Remove Contact]
    U8[Fetch Contact Public Key]
    class U5,U6,U7,U8 uc
  end

  subgraph CONVOS[Conversations]
    U9[Create Conversation - wrap content key per participant]
    U10[List Conversations]
    U11[Open Conversation]
    U12[Delete Conversation - leave]
    U13[Add Participants - share history]
    U14[Add Participants - rotate key]
    class U9,U10,U11,U12,U13,U14 uc
  end

  subgraph MSG[Messaging]
    U15[Send Message - AES-GCM]
    U16[Receive Real-time Message]
    U17[Load Message History]
    U18[Edit Message]
    U19[Delete Message]
    class U15,U16,U17,U18,U19 uc
  end

  subgraph RT[Realtime]
    U20[Join Conversation Channel]
    U21[Leave Conversation Channel]
    U22[Receive System Events - participants/key]
    class U20,U21,U22 uc
  end

  subgraph BAK[Backup & Local Data]
    U23[Create or Export Backup - encrypted content]
    U24[Import or Restore Backup]
    U25[Clear Local Messages]
    class U23,U24,U25 uc
  end

  User --> U1
  User --> U2
  User --> U3
  User --> U4
  User --> U5
  User --> U6
  User --> U7
  User --> U8
  User --> U9
  User --> U10
  User --> U11
  User --> U12
  User --> U13
  User --> U14
  User --> U15
  User --> U16
  User --> U17
  User --> U18
  User --> U19
  User --> U20
  User --> U21
  User --> U22
  User --> U23
  User --> U24
  User --> U25
```

## Installation

Prerequisites
- Node.js LTS (v18+ recommended)
- npm (bundled with Node)

Clone and install
- Run `npm install` in both `server/` and `client/` (see `documentation/README.md`).

Server environment
- Create `server/.env` with example defaults:
  - `PORT=8000`
  - `NODE_ENV=development`
  - `JWT_SECRET=<set-a-strong-secret>`
  - `DB_PATH=./database/securedove.db`
  - `CORS_ORIGIN=http://localhost:5173`
  - `RATE_LIMIT_WINDOW_MS=900000` and `RATE_LIMIT_MAX_REQUESTS=100`
  - `LOGIN_RATE_LIMIT_WINDOW_MS=900000` and `LOGIN_RATE_LIMIT_MAX_REQUESTS=5`

Client environment
- Create `client/.env` with:
  - `VITE_API_URL=http://localhost:8000/api`
  - Optionally: `VITE_SOCKET_URL=http://localhost:8000`

Database
- Initialize SQLite:
  - `cd server && npm run init-db`
  - Verify (optional): `npm run verify-db`

## Running

Option A: helper script
- From repo root: `./start.sh` (or `start.bat` on Windows)

Option B: separate
- Server: `cd server && npm run dev` (or `npm start`)
- Client: `cd client && npm run dev` (Vite dev server)

## Usage

1) Register and Login
- Registration generates an RSA keypair client‑side; the private key is encrypted with a password‑derived key and stored server‑side only in encrypted form. Login decrypts the private key client‑side after JWT authentication.

2) Contacts
- Add/remove/list contacts; fetch public keys for secure key wrapping.

3) Conversations
- Create with per‑participant wrapped content keys. Add participants either by:
  - Sharing history (re‑wrap historical keys), or
  - Rotating to a new content key (incremented key number).
- Leave/delete removes current user membership and emits a system event.

4) Messaging
- Messages are encrypted client‑side (AES‑GCM) with the conversation content key. Realtime delivery uses Socket.IO; history is fetched via REST and decrypted locally. Edit/delete operations update or remove encrypted payloads; system events appear as broadcast items.

5) Backup & Local Data
- Create/export a backup (JSON) of encrypted messages/metadata. Import/restore to merge or replace local data. Optionally clear all local messages.

## Notes

- Security: The server never handles plaintext messages or private keys; use HTTPS and a strong JWT secret in production.
- CORS/WebSocket: Match `CORS_ORIGIN` to the client dev server and `VITE_SOCKET_URL` to the server origin.
