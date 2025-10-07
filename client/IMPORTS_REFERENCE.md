# SecureDove - Complete Import/Export Reference

## ✅ Context Files (src/context/)

### AuthContext.jsx
```javascript
export const useAuth = () => { ... }
export const AuthProvider = ({ children }) => { ... }
```
**Usage:** `import { useAuth } from '../../context/AuthContext';`

### ContactsContext.jsx
```javascript
export const useContacts = () => { ... }
export const ContactsProvider = ({ children }) => { ... }
```
**Usage:** `import { useContacts } from '../../context/ContactsContext';`

### ConversationsContext.jsx
```javascript
export const useConversations = () => { ... }
export const ConversationsProvider = ({ children }) => { ... }
```
**Usage:** `import { useConversations } from '../../context/ConversationsContext';`

### MessagesContext.jsx
```javascript
export const useMessages = () => { ... }
export const MessagesProvider = ({ children }) => { ... }
```
**Usage:** `import { useMessages } from '../../context/MessagesContext';`

### ViewContext.jsx
```javascript
export const useViewContext = () => { ... }
export const ViewProvider = ({ children }) => { ... }
export const VIEWS = { DISCUSSIONS, CONTACTS, SETTINGS }
```
**Usage:** `import { useViewContext, VIEWS } from '../../context/ViewContext';`

### WebSocketContext.jsx
```javascript
export const useWebSocket = () => { ... }
export const WebSocketProvider = ({ children }) => { ... }
```
**Usage:** `import { useWebSocket } from '../../context/WebSocketContext';`

---

## ✅ Utility Files (src/utils/)

### api.js
```javascript
export const authAPI = { login, register, checkUsername }
export const contactsAPI = { getContacts, addContact, deleteContact, blockContact }
export const conversationsAPI = { getConversations, createConversation, getContentKeys, rotateContentKey }
export const messagesAPI = { getMessages, sendMessage, markAsRead }
export default apiClient
```
**Usage:**
```javascript
import { authAPI, contactsAPI, conversationsAPI, messagesAPI } from '../../utils/api';
```

### crypto.js
```javascript
export function bufferToHex(buffer)
export function hexToBuffer(hex)
export async function generateKeyPair()
export function generateSalt()
export async function exportPublicKey(publicKey)
export async function importPublicKey(publicKeyHex)
export async function exportPrivateKey(privateKey)
export async function importPrivateKey(privateKeyHex)
export async function derivePasswordKey(password, saltHex)
export async function encryptPrivateKey(privateKey, passwordKey)
export async function decryptPrivateKey(encryptedPrivateKeyHex, passwordKey)
export async function generateContentKey()
export async function exportContentKey(contentKey)
export async function importContentKey(contentKeyHex)
export async function encryptContentKey(contentKey, publicKey)
export async function decryptContentKey(encryptedContentKeyHex, privateKey)
export async function encryptMessage(messageObj, contentKey)
export async function decryptMessage(encryptedHex, contentKey)
```
**Usage:**
```javascript
import {
  generateKeyPair,
  exportPublicKey,
  encryptMessage,
  decryptMessage,
  // ... etc
} from '../../utils/crypto';
```

### messageStorage.js
```javascript
export const saveMessages = (conversationId, messages)
export const getStoredMessages = ()
export const getConversationMessages = (conversationId)
export const deleteConversationMessages = (conversationId)
export const clearAllMessages = ()
export const saveMetadata = (conversationId, metadata)
export const getStoredMetadata = ()
export const getConversationMetadata = (conversationId)
export const getStorageInfo = ()
```
**Usage:**
```javascript
import { 
  saveMessages, 
  getStoredMessages, 
  getStorageInfo,
  clearAllMessages 
} from '../../utils/messageStorage';
```

### messageBackup.js
```javascript
export const createBackup = async (password = null)
export const exportBackup = (backup, filename = null)
export const importBackup = (file)
export const restoreBackup = (backup, merge = false)
export const createAndExportBackup = async ()
export const importAndRestoreBackup = async (file, merge = false)
```
**Usage:**
```javascript
import { 
  createBackup, 
  exportBackup, 
  importBackup, 
  restoreBackup 
} from '../../utils/messageBackup';
```

---

## ⚠️ COMMON MISTAKES TO AVOID

### ❌ WRONG Hook Names:
- `useAuthContext` ❌ → Use `useAuth` ✅
- `useContactsContext` ❌ → Use `useContacts` ✅
- `useMessagesContext` ❌ → Use `useMessages` ✅
- `useConversationsContext` ❌ → Use `useConversations` ✅
- `useWebSocketContext` ❌ → Use `useWebSocket` ✅

### ❌ WRONG Function Names (messageStorage.js):
- `getStorageStats` ❌ → Use `getStorageInfo` ✅
- `clearAllMessagesForUser` ❌ → Use `clearAllMessages` ✅

### ❌ WRONG Function Names (messageBackup.js):
- `exportBackupToFile` ❌ → Use `exportBackup` ✅
- `importBackupFromFile` ❌ → Use `importBackup` ✅
- `getBackupInfo` ❌ (doesn't exist - calculate manually)

### ❌ WRONG Variable Names:
- `user` ❌ → Use `currentSession` ✅
- `user.id` ❌ → Use `currentSession.userId` ✅
- `isConnected` ❌ → Use `connected` ✅
- `setCurrentView` ❌ → Use `switchView` ✅

### ❌ WRONG Import Paths:
- `from '../../hooks/useMessages'` ❌ → Use `from '../../context/MessagesContext'` ✅
- `from '../../hooks/useConversations'` ❌ → Use `from '../../context/ConversationsContext'` ✅

---

## ✅ CORRECT USAGE EXAMPLES

### Component with Auth:
```javascript
import { useAuth } from '../../context/AuthContext';

function MyComponent() {
  const { currentSession, login, logout } = useAuth();
  
  return <div>User: {currentSession?.username}</div>;
}
```

### Component with Contacts:
```javascript
import { useContacts } from '../../context/ContactsContext';

function ContactsList() {
  const { contacts, loading, addContact } = useContacts();
  
  return <div>{contacts.map(c => <div key={c.id}>{c.username}</div>)}</div>;
}
```

### Component with Messages:
```javascript
import { useMessages } from '../../context/MessagesContext';

function Chat() {
  const { messages, sendMessage, loadMessages } = useMessages();
  
  return <div>Messages here</div>;
}
```

### Component with Storage:
```javascript
import { getStorageInfo, clearAllMessages } from '../../utils/messageStorage';

function Settings() {
  const handleClear = () => {
    clearAllMessages();
    console.log('Cleared!');
  };
  
  const stats = getStorageInfo();
  return <button onClick={handleClear}>Clear</button>;
}
```

### Component with Backup:
```javascript
import { createBackup, exportBackup } from '../../utils/messageBackup';

function BackupButton() {
  const handleBackup = async () => {
    const backup = await createBackup();
    exportBackup(backup);
  };
  
  return <button onClick={handleBackup}>Backup</button>;
}
```

---

## 📋 Quick Reference Checklist

Before importing, always verify:
- [ ] Hook name is correct (no `...Context` suffix except `ViewContext`)
- [ ] Import path is from `/context/` not `/hooks/` directory
- [ ] Function name matches the exported name exactly
- [ ] Variable names use `currentSession` not `user`
- [ ] WebSocket uses `connected` not `isConnected`
- [ ] ViewContext uses `switchView` not `setCurrentView`
