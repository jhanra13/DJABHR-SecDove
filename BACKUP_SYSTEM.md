# SecDove Message Backup System

## Overview

SecDove now includes a comprehensive message backup and restore system that allows users to create encrypted backups of their sent messages with a PIN. This solves the persistence problem with end-to-end encrypted messaging on the web.

## Architecture

### Problem: Asymmetric Encryption Challenge

With end-to-end encryption, messages are encrypted with the **recipient's public key**. This means:
- ✅ Recipients can decrypt messages with their private key
- ❌ Senders **cannot** decrypt their own sent messages (they don't have the recipient's private key)

### Solution: IndexedDB + PIN-Encrypted Backups

1. **Local Storage with IndexedDB**
   - Sent messages are stored in plain text locally using IndexedDB
   - Provides better persistence than localStorage (~50MB+ vs ~5-10MB)
   - Survives browser restarts and page refreshes
   - **Does NOT survive browser data clearing**

2. **PIN-Encrypted Backups**
   - Users can create encrypted backups with a PIN
   - Backups are exported as downloadable JSON files
   - Can be restored on any device or after clearing browser data
   - Uses AES-GCM encryption with PBKDF2 key derivation

## Components

### 1. Message Storage (`messageStorage.js`)

Handles IndexedDB operations for sent messages:

```javascript
import { 
    storeSentMessage,           // Store a sent message
    getSentMessage,             // Get a specific message by ID
    getSentMessagesForConversation, // Get messages for a conversation
    getAllSentMessagesForUser,  // Get all messages for a user
    updateMessageId,            // Migrate temp ID to server ID
    deleteSentMessage,          // Delete a message
    cleanupOldMessages,         // Remove messages older than X days
    clearAllMessagesForUser,    // Clear all messages for a user
    getStorageStats            // Get storage statistics
} from './utils/messageStorage';
```

**Database Schema:**
- **Store:** `sentMessages`
- **Key:** `id` (message ID)
- **Indexes:**
  - `userId` - For querying user's messages
  - `conversationId` - For querying conversation messages
  - `sentAt` - For time-based queries
  - `userConversation` - Compound index for efficient queries

**Message Structure:**
```javascript
{
    id: string,              // Message ID (temp or server ID)
    userId: number,          // User ID
    sender_id: number,       // Same as userId
    recipient_id: number,    // Recipient ID
    conversationId: number,  // Conversation/contact ID
    content: string,         // Plain text content (NOT encrypted)
    sent_at: string,         // ISO timestamp
    sender_username: string, // Sender's username
    storedAt: number,        // Timestamp when stored
    version: number          // Schema version
}
```

### 2. Message Backup (`messageBackup.js`)

Handles backup creation and restoration with PIN encryption:

```javascript
import {
    createBackup,           // Create encrypted backup
    restoreBackup,          // Restore from backup
    exportBackupToFile,     // Export backup as JSON
    importBackupFromFile,   // Import backup from JSON
    verifyBackupPIN,        // Test PIN without restoring
    getBackupInfo          // Get backup metadata
} from './utils/messageBackup';
```

**Encryption Process:**
1. User enters a PIN (minimum 4 characters)
2. Random salt (16 bytes) and IV (12 bytes) are generated
3. PIN is derived into AES-256 key using PBKDF2 (100,000 iterations, SHA-256)
4. Messages are encrypted using AES-GCM
5. Backup package includes salt, IV, and encrypted data

**Backup File Structure:**
```javascript
{
    version: 1,              // Backup version
    userId: number,          // User ID
    createdAt: string,       // ISO timestamp
    messageCount: number,    // Number of messages
    salt: string,            // Base64 encoded salt
    iv: string,              // Base64 encoded IV
    data: string            // Base64 encoded encrypted data
}
```

### 3. Backup Modal (`BackupModal.jsx`)

User interface for backup and restore operations:

**Features:**
- **Backup Tab:**
  - Create encrypted backups with PIN
  - View storage statistics
  - Download backup as JSON file
  - Clear all messages (with confirmation)

- **Restore Tab:**
  - Upload backup file
  - View backup information
  - Enter PIN to decrypt and restore
  - Progress feedback

### 4. Settings View (`SettingsView.jsx`)

Settings page with backup management:

**Sections:**
- **Account:** Username and user ID
- **Message Backup:** Access to backup modal and storage stats
- **Security:** Information about encryption
- **About:** App version and info

### 5. Updated `useMessages` Hook

Integrated with IndexedDB for message persistence:

**Flow:**
1. When sending a message:
   - Generate temporary ID
   - Store in IndexedDB immediately
   - Send encrypted message to server
   - Migrate temp ID to server ID after confirmation

2. When fetching messages:
   - Get messages from server
   - For received messages: decrypt with private key
   - For sent messages: retrieve plain text from IndexedDB

## Usage

### Creating a Backup

1. Navigate to Settings (⚙️ icon in sidebar)
2. Click "Manage Backups"
3. Go to "Backup" tab
4. Enter a PIN (minimum 4 characters)
5. Confirm PIN
6. Click "Create Backup"
7. Save the downloaded JSON file somewhere safe

**Important:** Keep your PIN safe! Without it, you cannot restore your backup.

### Restoring a Backup

1. Navigate to Settings → Manage Backups
2. Go to "Restore" tab
3. Click "Select Backup File" and choose your backup JSON
4. Enter your backup PIN
5. Click "Restore Backup"
6. Wait for restoration to complete
7. Page will reload with restored messages

### Clearing Messages

⚠️ **Warning:** This permanently deletes all sent messages from IndexedDB!

1. Navigate to Settings → Manage Backups
2. Scroll to "Danger Zone"
3. Click "Clear All Messages"
4. Confirm twice (make sure you have a backup!)

## Security Considerations

### What's Secure:
- ✅ Received messages are E2E encrypted
- ✅ Private keys stored locally only
- ✅ Backup files are encrypted with strong AES-GCM
- ✅ PBKDF2 with 100,000 iterations prevents brute force
- ✅ Random salt prevents rainbow table attacks

### What's NOT Secure:
- ❌ Sent messages stored in plain text in IndexedDB
- ❌ Anyone with access to your browser can read sent messages
- ❌ Weak PINs can be brute-forced if backup file is stolen
- ❌ Browser storage is vulnerable to XSS attacks

### Recommendations:
1. Use strong PINs (8+ characters, mix of letters/numbers/symbols)
2. Keep backup files in secure locations
3. Don't share your backup files
4. Clear messages after backing up if on shared device
5. Use device encryption for additional security

## Storage Limits

### IndexedDB:
- **Chrome/Edge:** ~60% of available disk space
- **Firefox:** ~50% of available disk space
- **Safari:** ~1GB (may prompt user)
- **Practical limit:** Usually 50MB-1GB

### Message Estimates:
- **Average message:** ~500 bytes
- **1000 messages:** ~500 KB
- **10,000 messages:** ~5 MB
- **100,000 messages:** ~50 MB

Most users will never hit storage limits.

## Cleanup

To prevent IndexedDB from growing too large, you can:

1. **Manual cleanup:** Use "Clear All Messages" in Settings
2. **Automatic cleanup:** Call `cleanupOldMessages(30)` to remove messages older than 30 days

```javascript
import { cleanupOldMessages } from './utils/messageStorage';

// Remove messages older than 30 days
await cleanupOldMessages(30);
```

## Migration from Old System

If you had messages stored in the old localStorage system:

The old system used keys like:
- `sent_msg_${messageId}`
- `temp_sent_${contactId}_${timestamp}`

These are **not automatically migrated**. To preserve old messages:

1. Create a backup with the new system
2. Old messages will be lost after clearing localStorage
3. Future messages use IndexedDB

## API Reference

### Storage Operations

```javascript
// Store a sent message
await storeSentMessage({
    id: 'msg123',
    userId: 1,
    conversationId: 2,
    content: 'Hello!',
    sent_at: new Date().toISOString()
});

// Get a specific message
const message = await getSentMessage('msg123');

// Get all messages for a conversation
const messages = await getSentMessagesForConversation(userId, conversationId);

// Get storage statistics
const stats = await getStorageStats(userId);
// Returns: { totalMessages, oldestMessage, newestMessage, estimatedSize }
```

### Backup Operations

```javascript
// Create backup
const backupPackage = await createBackup(userId, pin);

// Export to file
exportBackupToFile(backupPackage, userId);
// Downloads: secdove-backup-{userId}-{timestamp}.json

// Import from file
const backupPackage = await importBackupFromFile(file);

// Restore backup
const result = await restoreBackup(backupPackage, pin, userId);
// Returns: { success, restoredCount, failedCount, totalMessages }

// Verify PIN
const isValid = await verifyBackupPIN(backupPackage, pin);
```

## Troubleshooting

### Messages Not Appearing After Restore

1. Check browser console for errors
2. Verify PIN is correct
3. Try refreshing the page
4. Check if user ID matches

### Backup File Won't Import

1. Ensure file is valid JSON
2. Check file wasn't corrupted
3. Verify it's a SecDove backup file
4. Try re-exporting from original device

### Storage Quota Exceeded

1. Check available disk space
2. Clear old messages: `cleanupOldMessages(30)`
3. Create backup and clear all messages
4. Check other browser storage usage

### Messages Disappeared

1. Did you clear browser data?
2. Check if you're logged in as correct user
3. Try restoring from backup
4. Check IndexedDB in DevTools (Application tab)

## Future Enhancements

Possible improvements:
- [ ] Automatic periodic backups
- [ ] Cloud backup storage (with encryption)
- [ ] Backup encryption with user's private key
- [ ] Multi-device sync
- [ ] Message export to other formats (PDF, TXT)
- [ ] Backup compression
- [ ] Incremental backups
- [ ] Backup versioning

## Technical Details

### Why Not Server-Side Storage?

Server-side storage would break E2E encryption because:
- Server would need plain text to store messages
- Defeats the purpose of end-to-end encryption
- Increases security risks

### Why IndexedDB Over localStorage?

1. **Capacity:** 50MB+ vs 5-10MB
2. **Performance:** Asynchronous vs synchronous
3. **Structure:** Indexes for efficient queries
4. **Reliability:** Better persistence across sessions

### Key Derivation Details

**PBKDF2 Parameters:**
- **Iterations:** 100,000 (OWASP recommendation)
- **Hash:** SHA-256
- **Salt:** 16 bytes (128 bits)
- **Output:** AES-256 key (32 bytes)

**Why 100,000 iterations?**
- Slows down brute force attacks
- ~100ms on modern hardware
- Acceptable UX delay
- OWASP recommended minimum

## License

Part of SecDove - Secure End-to-End Encrypted Messaging Application
