# SecureDove Hooks Reference

## Context Providers and Their Hooks

### 1. AuthContext
**File:** `src/context/AuthContext.jsx`
**Provider:** `AuthProvider`
**Hook:** `useAuth()`
**Exports:**
```javascript
export const useAuth = () => { ... }
export const AuthProvider = ({ children }) => { ... }
```

**Usage:**
```javascript
import { useAuth } from '../../context/AuthContext';

const { currentSession, login, logout, register, checkUsernameExists } = useAuth();
```

**Returns:**
- `currentSession`: Current user session object
- `loading`: Boolean loading state
- `error`: Error message string
- `login(username, password)`: Login function
- `register(username, password)`: Register function
- `logout()`: Logout function
- `checkUsernameExists(username)`: Check if username exists

---

### 2. ContactsContext
**File:** `src/context/ContactsContext.jsx`
**Provider:** `ContactsProvider`
**Hook:** `useContacts()`
**Exports:**
```javascript
export const useContacts = () => { ... }
export const ContactsProvider = ({ children }) => { ... }
```

**Usage:**
```javascript
import { useContacts } from '../../context/ContactsContext';

const { contacts, loading, error, addContact, deleteContact, blockContact } = useContacts();
```

**Returns:**
- `contacts`: Array of contact objects
- `loading`: Boolean loading state
- `error`: Error message string
- `loadContacts()`: Refresh contacts list
- `addContact(username)`: Add new contact
- `deleteContact(contactId)`: Delete contact
- `blockContact(contactId)`: Block contact

---

### 3. ConversationsContext
**File:** `src/context/ConversationsContext.jsx`
**Provider:** `ConversationsProvider`
**Hook:** `useConversations()`
**Exports:**
```javascript
export const useConversations = () => { ... }
export const ConversationsProvider = ({ children }) => { ... }
```

**Usage:**
```javascript
import { useConversations } from '../../context/ConversationsContext';

const { conversations, loading, error, createConversation, getContentKey } = useConversations();
```

**Returns:**
- `conversations`: Array of conversation objects
- `loading`: Boolean loading state
- `error`: Error message string
- `loadConversations()`: Refresh conversations list
- `createConversation(participantIds)`: Create new conversation
- `getContentKey(conversationId)`: Get content encryption key
- `rotateContentKey(conversationId)`: Rotate encryption key

---

### 4. MessagesContext
**File:** `src/context/MessagesContext.jsx`
**Provider:** `MessagesProvider`
**Hook:** `useMessages()`
**Exports:**
```javascript
export const useMessages = () => { ... }
export const MessagesProvider = ({ children }) => { ... }
```

**Usage:**
```javascript
import { useMessages } from '../../context/MessagesContext';

const { messages, loading, error, loadMessages, sendMessage } = useMessages();
```

**Returns:**
- `messages`: Object with conversationId as keys
- `loading`: Boolean loading state
- `error`: Error message string
- `loadMessages(conversationId)`: Load and decrypt messages
- `sendMessage(conversationId, content)`: Encrypt and send message

---

### 5. ViewContext
**File:** `src/context/ViewContext.jsx`
**Provider:** `ViewProvider`
**Hook:** `useViewContext()`
**Exports:**
```javascript
export const useViewContext = () => { ... }
export const ViewProvider = ({ children }) => { ... }
export const VIEWS = { DISCUSSIONS, CONTACTS, SETTINGS }
```

**Usage:**
```javascript
import { useViewContext, VIEWS } from '../../context/ViewContext';

const { currentView, selectedConversation, switchView, selectConversation } = useViewContext();
```

**Returns:**
- `currentView`: Current view string (VIEWS.DISCUSSIONS, etc.)
- `selectedConversation`: Currently selected conversation ID
- `switchView(view)`: Switch to different view
- `selectConversation(conversationId)`: Select a conversation
- `clearConversation()`: Clear selected conversation
- `VIEWS`: Object with view constants

---

### 6. WebSocketContext
**File:** `src/context/WebSocketContext.jsx`
**Provider:** `WebSocketProvider`
**Hook:** `useWebSocket()`
**Exports:**
```javascript
export const useWebSocket = () => { ... }
export const WebSocketProvider = ({ children }) => { ... }
```

**Usage:**
```javascript
import { useWebSocket } from '../../context/WebSocketContext';

const { connected, messages, sendMessage } = useWebSocket();
```

**Returns:**
- `connected`: Boolean connection state
- `messages`: Array of WebSocket messages
- `sendMessage(message)`: Send WebSocket message

---

## ⚠️ IMPORTANT NOTES

1. **DO NOT** use `useAuthContext` - use `useAuth()` instead
2. **DO NOT** use `useContactsContext` - use `useContacts()` instead
3. **DO NOT** use `useMessagesContext` - use `useMessages()` instead
4. **DO NOT** use `useConversationsContext` - use `useConversations()` instead

5. **DO NOT** import from `../../hooks/useMessages` - import from `../../context/MessagesContext`
6. **DO NOT** import from `../../hooks/useConversations` - import from `../../context/ConversationsContext`

7. The hooks in `src/hooks/` directory are DUPLICATES and should NOT be used
8. Always import hooks directly from their context files in `src/context/`

---

## Provider Hierarchy

```jsx
<WebSocketProvider>
  <AuthProvider>
    <ContactsProvider>
      <ConversationsProvider>
        <MessagesProvider>
          <ViewProvider>
            <App />
          </ViewProvider>
        </MessagesProvider>
      </ConversationsProvider>
    </ContactsProvider>
  </AuthProvider>
</WebSocketProvider>
```
