# SecureDove Server

Backend server for the SecureDove End-to-End Encrypted (E2EE) messaging application.

## Features

- **Zero-Knowledge Architecture**: Server never has access to plaintext messages or private keys
- **E2EE Message Storage**: All messages stored encrypted with AES-GCM
- **RSA Key Pair Management**: Public keys stored, private keys encrypted client-side
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Protection against brute force attacks
- **SQLite Database**: Lightweight, efficient data storage

## Tech Stack

- **Runtime**: Node.js with ES Modules
- **Framework**: Express.js
- **Database**: SQLite3
- **Authentication**: bcrypt + JWT
- **Security**: Helmet.js, CORS, Rate Limiting

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Initialize the database:
```bash
npm run init-db
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `JWT_SECRET`: Secret key for JWT signing (MUST change in production)
- `DB_PATH`: Path to SQLite database file
- `CORS_ORIGIN`: Allowed CORS origin
- `RATE_LIMIT_WINDOW_MS`: Rate limit window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window
- `LOGIN_RATE_LIMIT_WINDOW_MS`: Login rate limit window
- `LOGIN_RATE_LIMIT_MAX_REQUESTS`: Max login attempts per window

## Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/user` - Get current user info (authenticated)
- `POST /api/auth/logout` - Logout (authenticated)

### Contacts
- `POST /api/contacts` - Add contact (authenticated)
- `GET /api/contacts` - Get all contacts (authenticated)
- `DELETE /api/contacts/:contactId` - Remove contact (authenticated)
- `GET /api/contacts/:username/public-key` - Get user's public key (authenticated)

### Conversations
- `POST /api/conversations` - Create conversation (authenticated)
- `GET /api/conversations` - Get all conversations (authenticated)
- `GET /api/conversations/:conversationId` - Get conversation details (authenticated)
- `DELETE /api/conversations/:conversationId` - Delete conversation (authenticated)

### Messages
- `POST /api/messages` - Send message (authenticated)
- `GET /api/messages/:conversationId` - Get messages (authenticated)
- `PUT /api/messages/:messageId` - Update message (authenticated)
- `DELETE /api/messages/:messageId` - Delete message (authenticated)
- `GET /api/messages/recent/all` - Get recent messages (authenticated)

## Security Features

### Password Security
- Bcrypt hashing with cost factor 12
- No plaintext passwords stored

### Rate Limiting
- General API: 100 requests per 15 minutes
- Login endpoint: 5 attempts per 15 minutes

### JWT Tokens
- 24-hour expiration
- Secure signing with secret key

### Data Protection
- All sensitive data encrypted client-side
- Server never accesses plaintext messages
- Private keys encrypted before transmission
- Foreign key constraints for data integrity

## Database Schema

### Users
- Stores username, password hash, public key, salt, and encrypted private key
- Unique username constraint
- Indexed on username for fast lookups

### Contacts
- Links users together
- Foreign key constraints for referential integrity
- Prevents self-contact

### Conversations
- Stores encrypted content keys for each participant
- Supports key rotation via content_key_number
- Composite primary key: (id, content_key_number, username)

### Messages
- Stores encrypted message content
- Soft delete support (is_deleted flag)
- Indexed on conversation_id and created_at
- Foreign key to conversations

## Development

### Project Structure
```
server/
├── config/
│   └── database.js        # Database connection and helpers
├── middleware/
│   ├── auth.js            # JWT authentication middleware
│   └── rateLimiter.js     # Rate limiting configuration
├── routes/
│   ├── auth.js            # Authentication endpoints
│   ├── contacts.js        # Contact management endpoints
│   ├── conversations.js   # Conversation endpoints
│   └── messages.js        # Message endpoints
├── scripts/
│   └── initDatabase.js    # Database initialization script
├── utils/
│   └── auth.js            # Authentication utilities
├── .env                   # Environment variables
├── .env.example           # Example environment variables
├── package.json           # Dependencies and scripts
└── server.js              # Main server file
```

## Error Handling

All endpoints return consistent error responses:
```json
{
  "error": "Error message description"
}
```

HTTP Status Codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `500`: Internal Server Error

## Production Deployment

1. Set `NODE_ENV=production` in environment variables
2. Generate a strong random `JWT_SECRET`
3. Configure proper `CORS_ORIGIN` for your frontend domain
4. Use HTTPS (required for security)
5. Set up proper database backups
6. Configure firewall rules
7. Use a process manager (PM2, systemd)

## License

MIT
