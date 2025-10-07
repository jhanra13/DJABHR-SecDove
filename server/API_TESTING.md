# API Testing Guide

This guide provides example requests for testing the SecureDove API endpoints.

## Base URL
```
http://localhost:3000/api
```

## Health Check
```bash
curl http://localhost:3000/health
```

## Authentication

### 1. Register a User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "SecurePassword123!",
    "public_key": "dummy_public_key_base64_here",
    "salt": "dummy_salt_hex_here",
    "encrypted_private_key": "dummy_encrypted_private_key_hex_here"
  }'
```

Response:
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "alice",
    "public_key": "...",
    "salt": "...",
    "encrypted_private_key": "..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "SecurePassword123!"
  }'
```

Response:
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "alice",
    "public_key": "...",
    "salt": "...",
    "encrypted_private_key": "..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3. Get Current User (Authenticated)
```bash
curl -X GET http://localhost:3000/api/auth/user \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Logout (Authenticated)
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Contacts

### 1. Add Contact (Authenticated)
```bash
curl -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "contact_username": "bob"
  }'
```

### 2. Get All Contacts (Authenticated)
```bash
curl -X GET http://localhost:3000/api/contacts \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Get User Public Key (Authenticated)
```bash
curl -X GET http://localhost:3000/api/contacts/bob/public-key \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Delete Contact (Authenticated)
```bash
curl -X DELETE http://localhost:3000/api/contacts/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Conversations

### 1. Create Conversation (Authenticated)
```bash
curl -X POST http://localhost:3000/api/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "conversation_entries": [
      {
        "id": 1234567890123,
        "content_key_number": 1,
        "username": "alice",
        "encrypted_content_key": "encrypted_key_for_alice_hex"
      },
      {
        "id": 1234567890123,
        "content_key_number": 1,
        "username": "bob",
        "encrypted_content_key": "encrypted_key_for_bob_hex"
      }
    ]
  }'
```

### 2. Get All Conversations (Authenticated)
```bash
curl -X GET http://localhost:3000/api/conversations \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Get Specific Conversation (Authenticated)
```bash
curl -X GET http://localhost:3000/api/conversations/1234567890123 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Delete Conversation (Authenticated)
```bash
curl -X DELETE http://localhost:3000/api/conversations/1234567890123 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Messages

### 1. Send Message (Authenticated)
```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "conversation_id": 1234567890123,
    "content_key_number": 1,
    "encrypted_msg_content": "encrypted_message_content_hex_here"
  }'
```

### 2. Get Messages for Conversation (Authenticated)
```bash
curl -X GET "http://localhost:3000/api/messages/1234567890123?limit=50&offset=0" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Update Message (Authenticated)
```bash
curl -X PUT http://localhost:3000/api/messages/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "encrypted_msg_content": "new_encrypted_message_content_hex"
  }'
```

### 4. Delete Message (Authenticated)
```bash
curl -X DELETE http://localhost:3000/api/messages/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 5. Get Recent Messages (Authenticated)
```bash
curl -X GET "http://localhost:3000/api/messages/recent/all?limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400` Bad Request - Invalid input
- `401` Unauthorized - Missing or invalid token
- `403` Forbidden - Access denied
- `404` Not Found - Resource doesn't exist
- `409` Conflict - Duplicate resource
- `429` Too Many Requests - Rate limit exceeded
- `500` Internal Server Error - Server error

## Notes

1. **Authentication**: Most endpoints require a JWT token in the Authorization header
2. **Token Format**: `Authorization: Bearer YOUR_TOKEN_HERE`
3. **Content Type**: Always use `Content-Type: application/json` for POST/PUT requests
4. **Rate Limiting**: 
   - General API: 100 requests per 15 minutes
   - Login: 5 attempts per 15 minutes
5. **Pagination**: Messages endpoint supports `limit` and `offset` query parameters

## Testing with Postman or Thunder Client

1. Import the base URL: `http://localhost:3000/api`
2. Create a new request collection
3. Set up an environment variable for the token
4. After login, save the token to the environment variable
5. Use `{{token}}` in the Authorization header for subsequent requests
