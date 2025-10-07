# Salt Storage & Persistence Analysis

## ✅ The Salt DOES Persist - Here's the Complete Flow

### Summary
**The salt is stored in THREE places:**
1. 🗄️ **Server Database** (permanent storage)
2. 💾 **Client localStorage** (persists across page reloads)
3. 🧠 **Client Memory** (currentSession, cleared on logout)

---

## 📍 Where Salt is Stored

### 1. Server-Side Database Storage (PRIMARY) ✅

**Database Schema:**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  public_key TEXT NOT NULL,
  salt TEXT NOT NULL,              -- ✅ STORED HERE (permanent)
  encrypted_private_key TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

**File:** `server/scripts/initDatabase.js` (line 42)

---

### 2. Registration Flow - Salt Creation & Storage

**Client Side:**
```javascript
// File: client/src/context/AuthContext.jsx (line 112)

// Step 1: Generate salt (16 random bytes)
const salt = generateSalt(); // Returns hex string like "a3f5b2c8e4d9f1a2..."

// Step 2: Use salt to derive password key
const passwordKey = await derivePasswordKey(password, salt);

// Step 3: Send to server
const response = await authAPI.register({
  username,
  password,
  public_key: publicKey,
  salt,                              // ✅ SENT TO SERVER
  encrypted_private_key: encryptedPrivateKey
});
```

**Server Side:**
```javascript
// File: server/routes/auth.js (line 38)

// Store in database
const result = await run(
  `INSERT INTO users (username, password_hash, public_key, salt, encrypted_private_key, created_at) 
   VALUES (?, ?, ?, ?, ?, ?)`,
  [username, password_hash, public_key, salt, encrypted_private_key, Date.now()]
  //                                     ^^^^
  //                          ✅ SALT STORED IN DATABASE
);

// Return to client (including salt)
res.status(201).json({
  user: {
    id: result.id,
    username,
    public_key,
    salt,                             // ✅ RETURNED TO CLIENT
    encrypted_private_key
  },
  token
});
```

**Client localStorage:**
```javascript
// File: client/src/context/AuthContext.jsx (line 152)

// Store in localStorage for session restoration
localStorage.setItem('sessionData', JSON.stringify({
  userId: session.userId,
  username: session.username,
  publicKey: session.publicKey,
  salt: session.salt,               // ✅ STORED IN LOCALSTORAGE
  encrypted_private_key: session.encrypted_private_key,
  loginTime: session.loginTime
}));
```

---

### 3. Login Flow - Salt Retrieval

**Client Side:**
```javascript
// File: client/src/context/AuthContext.jsx (line 171)

// Step 1: Login request
const response = await authAPI.login({ username, password });
```

**Server Side:**
```javascript
// File: server/routes/auth.js (line 77-79)

// Fetch user from database (including salt)
const user = await get(
  'SELECT id, username, password_hash, public_key, salt, encrypted_private_key FROM users WHERE username = ?',
  //                                                ^^^^
  //                                    ✅ SALT RETRIEVED FROM DATABASE
  [username]
);

// Return salt to client
res.json({
  user: {
    id: user.id,
    username: user.username,
    public_key: user.public_key,
    salt: user.salt,                  // ✅ SALT RETURNED FROM DATABASE
    encrypted_private_key: user.encrypted_private_key
  },
  token
});
```

**Client Side:**
```javascript
// File: client/src/context/AuthContext.jsx (line 183)

// Step 2: Use retrieved salt to derive password key
const passwordKey = await derivePasswordKey(password, response.user.salt);
//                                                     ^^^^^^^^^^^^^^^^^^
//                                           ✅ SALT FROM SERVER DATABASE

// Step 3: Decrypt private key using password key
const privateKey = await decryptPrivateKey(response.user.encrypted_private_key, passwordKey);

// Step 4: Store salt in session
const session = {
  userId: response.user.id,
  username: response.user.username,
  publicKey: response.user.public_key,
  salt: response.user.salt,           // ✅ STORED IN MEMORY
  encrypted_private_key: response.user.encrypted_private_key,
  privateKey: privateKey,
  loginTime: Date.now()
};

// Step 5: Store salt in localStorage (for re-login)
localStorage.setItem('sessionData', JSON.stringify({
  userId: session.userId,
  username: session.username,
  publicKey: session.publicKey,
  salt: session.salt,                 // ✅ STORED IN LOCALSTORAGE
  encrypted_private_key: session.encrypted_private_key,
  loginTime: session.loginTime
}));
```

---

## 🔄 Complete Salt Lifecycle

### Registration:
```
1. Client generates random 16-byte salt
2. Client sends salt to server
3. Server stores salt in database ✅ PERSISTS PERMANENTLY
4. Server returns salt to client
5. Client stores salt in localStorage ✅ PERSISTS ACROSS PAGE RELOADS
6. Client stores salt in memory (currentSession)
```

### Login:
```
1. Client sends username + password
2. Server retrieves salt from database ✅ PERMANENT STORAGE
3. Server returns salt to client
4. Client uses salt to derive password key
5. Client decrypts private key
6. Client stores salt in localStorage ✅ PERSISTS
7. Client stores salt in memory (currentSession)
```

### Page Reload (Current Behavior):
```
1. Client clears session (privateKey check fails)
2. User must log in again
3. Login fetches salt from server database ✅ STILL THERE
4. Process continues as normal login
```

---

## 🔍 Verification: Check Database

To verify salt is persisted, you can check the database:

```bash
# Navigate to server directory
cd server

# Open SQLite database
sqlite3 database/securedove.db

# Query users table
SELECT username, salt, length(salt) as salt_length FROM users;
```

**Expected Output:**
```
alice|a3f5b2c8e4d9f1a2b7c4e6f8d1a3b5c7|32
bob|f8e9d7c5b3a1f2e4d6c8b0a2f4e6d8c0|32
```

The salt should be a 32-character hex string (16 bytes = 32 hex chars).

---

## ✅ Salt Persistence Confirmed

| Storage Location | Persists Across | Purpose |
|-----------------|-----------------|---------|
| **Database** | ✅ Forever (until deleted) | Primary permanent storage |
| **localStorage** | ✅ Page reloads | Quick re-login without server call |
| **Memory (currentSession)** | ❌ Page reload, logout | Active session use |

---

## 🎯 Why This is Secure

1. **Salt is NOT secret**: It's stored in plain text, which is correct!
2. **Salt prevents rainbow table attacks**: Even with same password, different salts = different encrypted keys
3. **Unique per user**: Each user gets their own random salt
4. **Persists forever**: User can always decrypt their private key with correct password
5. **Server-side backup**: Even if localStorage is cleared, login fetches from database

---

## 🔐 Security Properties

### What the Salt Does:
- Used with PBKDF2 to derive an AES key from the password
- Ensures same password + different salt = different keys
- Prevents pre-computed attacks on encrypted private keys
- NOT used for password hashing (that's bcrypt's job)

### Salt vs Password Hash:
```
Password Hash (bcrypt):     Used for authentication
                           Server verifies password
                           Never sent to client

Salt (PBKDF2):             Used for key derivation
                           Client derives encryption key
                           Stored in plain text (OK!)
```

---

## ✅ Conclusion

**The salt DOES persist!** It's stored in:
1. ✅ Server database (permanent)
2. ✅ Client localStorage (survives page refresh)
3. ✅ Client memory (active session)

Every time a user logs in:
1. Server retrieves salt from database
2. Client uses salt to derive password key
3. Client decrypts private key
4. User can access encrypted conversations

**No issues with salt persistence!** The E2EE system is working correctly.
