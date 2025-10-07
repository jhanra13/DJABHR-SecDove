# E2EE Flow Verification & Critical Bug Analysis

## ✅ VERIFIED: Encryption Flow Analysis

### 1. Private Key Decryption Flow ✅
**Registration Flow:**
```javascript
// Step 1: Generate RSA key pair
const keyPair = await generateKeyPair(); // Returns { publicKey, privateKey } CryptoKey objects

// Step 2: Generate salt
const salt = generateSalt(); // 16 random bytes

// Step 3: Derive password key
const passwordKey = await derivePasswordKey(password, salt); // PBKDF2, 100k iterations

// Step 4: Encrypt private key
const encryptedPrivateKey = await encryptPrivateKey(keyPair.privateKey, passwordKey);
// - Exports private key to PKCS8 format
// - Generates unique 12-byte IV
// - Encrypts with AES-GCM using passwordKey
// - Prepends IV to ciphertext
// - Returns hex string

// Step 5: Store encrypted private key on server (plain text storage is OK)
```

**Login Flow:**
```javascript
// Step 1: Server validates password, returns user data
const response = await authAPI.login({ username, password });

// Step 2: Derive same password key
const passwordKey = await derivePasswordKey(password, response.user.salt);

// Step 3: Decrypt private key
const privateKey = await decryptPrivateKey(response.user.encrypted_private_key, passwordKey);
// - Converts hex to buffer
// - Extracts IV (first 12 bytes)
// - Decrypts with AES-GCM
// - Imports as CryptoKey with usages: ['decrypt']
// - NOT extractable for security

// Step 4: Store in memory only
session.privateKey = privateKey; // CryptoKey object
```

**✅ CONCLUSION: Private key decryption is CORRECT**

---

### 2. Public Key Storage ✅
**Database Schema:**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  public_key TEXT NOT NULL,  -- ✅ STORED IN PLAIN TEXT (CORRECT!)
  salt TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

**Why Plain Text Storage is Correct:**
- Public keys are MEANT to be public
- Anyone needs access to encrypt content for that user
- No security risk - public keys can't decrypt anything
- Server provides public key lookup endpoint: `GET /api/contacts/:username/public-key`

**✅ CONCLUSION: Public key storage is CORRECT**

---

### 3. Content Key Encryption Flow ✅

**When Creating a Conversation:**
```javascript
// Step 1: Generate symmetric content key
const contentKey = await generateContentKey(); // AES-GCM 256-bit, extractable

// Step 2: Get public keys for all participants
const publicKeys = {};
for (const username of participantUsernames) {
  if (username === currentSession.username) {
    publicKeys[username] = currentSession.publicKey; // Own public key from session
  } else {
    const response = await contactsAPI.getPublicKey(username); // Fetch from server
    publicKeys[username] = response.public_key;
  }
}

// Step 3: Encrypt content key for EACH participant
const entries = [];
for (const username of participantUsernames) {
  // Import public key from hex string
  const publicKey = await importPublicKey(publicKeys[username]);
  
  // Encrypt content key with this participant's public key
  const encryptedContentKey = await encryptContentKey(contentKey, publicKey);
  // - Exports content key to raw format
  // - Encrypts with RSA-OAEP using participant's public key
  // - Returns hex string
  
  entries.push({
    id: conversationId,
    content_key_number: 1,
    username: username,
    encrypted_content_key: encryptedContentKey // Each participant gets their own encrypted version
  });
}

// Step 4: Send to server
await conversationsAPI.createConversation(entries);

// Step 5: Cache decrypted content key in memory
setContentKeyCache({
  [conversationId]: {
    keyNumber: 1,
    key: contentKey // Keep CryptoKey in memory for message encryption
  }
});
```

**✅ CONCLUSION: Content key encryption is CORRECT**
- Each participant gets their own RSA-encrypted copy of the symmetric content key
- Server stores encrypted versions, cannot decrypt them
- Only participants with private keys can decrypt their copy

---

### 4. Content Key Decryption Flow ✅

**When Loading Conversations:**
```javascript
// Step 1: Fetch user's conversation entries from server
const response = await conversationsAPI.getConversations();
const convos = response.conversations; // Each has user's encrypted_content_key

// Step 2: Decrypt content key for each conversation
for (const convo of convos) {
  // Decrypt using user's private key (from memory)
  const contentKey = await decryptContentKey(
    convo.encrypted_content_key,  // RSA-encrypted content key (hex)
    currentSession.privateKey      // CryptoKey with ['decrypt'] usage
  );
  // - Converts hex to buffer
  // - Decrypts with RSA-OAEP using private key
  // - Imports as AES-GCM key with ['encrypt', 'decrypt'] usages
  // - NOT extractable
  
  // Cache in memory
  cache[convo.id] = {
    keyNumber: convo.content_key_number,
    key: contentKey // CryptoKey object
  };
}
```

**✅ CONCLUSION: Content key decryption is CORRECT**

---

## 🔴 CRITICAL BUG FOUND: Session Restoration

### The Problem

**Current Behavior:**
```javascript
// On page reload, session is restored from localStorage
useEffect(() => {
  const initSession = async () => {
    const token = localStorage.getItem('token');
    const sessionData = localStorage.getItem('sessionData');
    
    if (token && sessionData) {
      const parsed = JSON.parse(sessionData);
      setCurrentSession(parsed); // ❌ privateKey is NULL or undefined!
    }
  };
  initSession();
}, []);
```

**What's Stored in localStorage:**
```javascript
{
  userId: 123,
  username: "alice",
  publicKey: "304a02...", // hex string ✓
  salt: "a3f5b2...",      // hex string ✓
  encrypted_private_key: "7f8e9a...", // hex string ✓
  loginTime: 1234567890,
  // ❌ privateKey is NOT stored (security feature)
}
```

**Result:**
- User refreshes page
- Session data restored from localStorage
- `currentSession.privateKey` is `null` or `undefined`
- User cannot decrypt content keys
- User cannot decrypt messages
- All encryption operations fail

### Security Considerations

**Why privateKey is NOT in localStorage:**
- Security best practice: Never persist decrypted private keys
- Private keys should only exist in memory during active session
- Page refresh should require re-authentication (enter password again)

**Two Options:**

#### Option 1: Force Re-Login on Page Refresh (Recommended) ✅
- Clear session on page load if privateKey is missing
- User must enter password again
- Most secure approach
- Standard practice for E2EE apps (Signal, WhatsApp Web, etc.)

#### Option 2: Prompt for Password on Restore (More Complex)
- Keep session but mark as "locked"
- Show password prompt modal
- Re-decrypt private key with password
- More user-friendly but adds complexity

**Recommendation: Option 1 (Force Re-Login)**

---

## 🔧 Required Fix

### Fix Session Restoration in AuthContext.jsx

The session restoration should check if privateKey exists, and if not, clear the session:

```javascript
useEffect(() => {
  const initSession = async () => {
    const token = localStorage.getItem('token');
    const sessionData = localStorage.getItem('sessionData');
    
    if (token && sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        // ❌ BUG: privateKey is always null/undefined after page reload
        // ✅ FIX: Don't restore session without privateKey
        if (!parsed.privateKey) {
          // Cannot restore session without private key in memory
          // User must log in again to decrypt private key
          clearSession();
        } else {
          setCurrentSession(parsed);
        }
      } catch (err) {
        console.error('Session init error:', err);
        clearSession();
      }
    }
    setLoading(false);
  };
  
  initSession();
}, []);
```

**Note:** Since `privateKey` is never stored in localStorage (correct security practice), this will effectively force re-login on every page refresh, which is the secure behavior.

---

## ✅ Complete E2EE Flow Summary

### Registration
1. User enters username + password
2. Client generates salt (16 random bytes)
3. Client derives password key from password + salt (PBKDF2)
4. Client generates RSA-OAEP 2048-bit key pair
5. Client encrypts private key with password key (AES-GCM)
6. Client sends to server: username, password, public_key, salt, encrypted_private_key
7. Server hashes password (bcrypt) and stores all data
8. Client keeps privateKey in memory (CryptoKey object)

### Login
1. User enters username + password
2. Server validates password hash
3. Server returns: user_id, username, public_key, salt, encrypted_private_key
4. Client derives password key from password + salt
5. Client decrypts encrypted_private_key to get privateKey
6. Client stores privateKey in memory only (NOT localStorage)

### Creating Conversation
1. Creator selects recipients from contacts
2. Client generates AES-GCM 256-bit content key
3. Client fetches public keys for all participants (including self)
4. Client encrypts content key with each participant's public key (RSA-OAEP)
5. Client sends array of entries to server: [{username, encrypted_content_key}, ...]
6. Server stores encrypted entries (cannot decrypt them)
7. Client caches decrypted content key in memory

### Loading Conversations
1. Client fetches user's conversation entries from server
2. For each conversation, client decrypts encrypted_content_key with privateKey
3. Client caches decrypted content keys in memory
4. Client can now encrypt/decrypt messages

### Sending Message
1. User types message
2. Client creates message object: {sender, timestamp, content}
3. Client encrypts with conversation's content key (AES-GCM)
4. Client sends encrypted message to server
5. Server stores encrypted message (cannot decrypt it)

### Receiving Message
1. Client fetches encrypted messages from server
2. Client decrypts with conversation's content key
3. Client displays plaintext message

---

## 🔐 Security Verification

✅ **Private keys never leave client in plaintext**
✅ **Private keys never stored persistently (memory only)**
✅ **Public keys stored in plaintext (correct - they're public)**
✅ **Content keys encrypted separately for each participant**
✅ **Server never has access to plaintext messages**
✅ **Server never has access to plaintext content keys**
✅ **Server never has access to plaintext private keys**
✅ **Each encryption operation uses unique IV**
✅ **Strong cryptography: RSA-2048, AES-256, PBKDF2-100k**

❌ **BUG: Session restoration doesn't require re-authentication**
✅ **FIX: Clear session on page reload (force re-login)**

---

## 📋 Recommendations

1. ✅ **Implement Fix:** Clear session if privateKey is missing (force re-login)
2. ✅ **User Education:** Show message "For security, please log in again" on page refresh
3. ⚠️ **Optional Enhancement:** Add "Remember Me" checkbox that stores encrypted private key with device-specific key
4. ⚠️ **Optional Enhancement:** Implement session locking with password re-entry modal
5. ✅ **Current Behavior:** 30-minute inactivity timeout already implemented

---

## Conclusion

**The E2EE implementation is fundamentally CORRECT:**
- ✅ Key generation follows best practices
- ✅ Encryption/decryption flows are secure
- ✅ Server is zero-knowledge (cannot decrypt anything)
- ✅ Public keys correctly stored in plaintext
- ✅ Content keys correctly encrypted for each participant

**One Critical Bug Found:**
- ❌ Session restoration doesn't handle missing privateKey
- ✅ Fix: Force re-login when privateKey is not in memory
- ✅ This is actually the MORE secure behavior
