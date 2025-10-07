// IndexedDB utilities for local message storage (Signal-style architecture)
// This provides offline-first messaging with server sync

const DB_NAME = 'SecDoveMessages';
const DB_VERSION = 1;
const MESSAGES_STORE = 'messages';
const CONVERSATIONS_STORE = 'conversations';

// Message status enum
export const MESSAGE_STATUS = {
    SENDING: 'sending',
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
    FAILED: 'failed'
};

// Initialize IndexedDB
export const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('❌ IndexedDB initialization failed');
            reject(request.error);
        };

        request.onsuccess = () => {
            console.log('✅ IndexedDB initialized successfully');
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Messages store
            if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
                const messagesStore = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
                messagesStore.createIndex('conversationId', 'conversationId', { unique: false });
                messagesStore.createIndex('senderId', 'senderId', { unique: false });
                messagesStore.createIndex('recipientId', 'recipientId', { unique: false });
                messagesStore.createIndex('sentAt', 'sentAt', { unique: false });
                messagesStore.createIndex('status', 'status', { unique: false });
                console.log('📦 Created messages store');
            }

            // Conversations store for metadata
            if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
                const conversationsStore = db.createObjectStore(CONVERSATIONS_STORE, { keyPath: 'id' });
                conversationsStore.createIndex('lastMessageAt', 'lastMessageAt', { unique: false });
                console.log('📦 Created conversations store');
            }
        };
    });
};

// Get database instance
let dbInstance = null;
export const getDB = async () => {
    if (!dbInstance) {
        dbInstance = await initDB();
    }
    return dbInstance;
};

// Message operations
export const saveMessage = async (message) => {
    const db = await getDB();
    const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
    const store = transaction.objectStore(MESSAGES_STORE);

    return new Promise((resolve, reject) => {
        const request = store.put(message);
        request.onsuccess = () => {
            console.log('💾 Message saved to local DB:', message.id);
            resolve(message);
        };
        request.onerror = () => reject(request.error);
    });
};

export const getMessagesForConversation = async (conversationId) => {
    const db = await getDB();
    const transaction = db.transaction([MESSAGES_STORE], 'readonly');
    const store = transaction.objectStore(MESSAGES_STORE);
    const index = store.index('conversationId');

    return new Promise((resolve, reject) => {
        const request = index.getAll(conversationId);
        request.onsuccess = () => {
            const messages = request.result.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
            console.log('📨 Loaded messages from local DB:', messages.length, 'for conversation:', conversationId);
            resolve(messages);
        };
        request.onerror = () => reject(request.error);
    });
};

export const updateMessageStatus = async (messageId, status) => {
    const db = await getDB();
    const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
    const store = transaction.objectStore(MESSAGES_STORE);

    return new Promise((resolve, reject) => {
        const getRequest = store.get(messageId);
        getRequest.onsuccess = () => {
            const message = getRequest.result;
            if (message) {
                message.status = status;
                const putRequest = store.put(message);
                putRequest.onsuccess = () => {
                    console.log('📝 Updated message status:', messageId, 'to', status);
                    resolve(message);
                };
                putRequest.onerror = () => reject(putRequest.error);
            } else {
                reject(new Error('Message not found'));
            }
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
};

export const deleteMessage = async (messageId) => {
    const db = await getDB();
    const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
    const store = transaction.objectStore(MESSAGES_STORE);

    return new Promise((resolve, reject) => {
        const request = store.delete(messageId);
        request.onsuccess = () => {
            console.log('🗑️ Deleted message from local DB:', messageId);
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
};

// Sync operations - merge server messages with local DB
export const syncMessagesFromServer = async (conversationId, serverMessages) => {
    const db = await getDB();
    const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
    const store = transaction.objectStore(MESSAGES_STORE);

    console.log('🔄 Syncing messages from server for conversation:', conversationId);

    // Get existing local messages
    const localMessages = await getMessagesForConversation(conversationId);
    const localMessageIds = new Set(localMessages.map(m => m.id));

    // Process server messages
    const messagesToSave = [];
    for (const serverMsg of serverMessages) {
        // Convert server format to local format
        const localMessage = {
            id: serverMsg.id,
            conversationId: conversationId,
            senderId: serverMsg.sender_id,
            recipientId: serverMsg.recipient_id,
            content: serverMsg.content || null, // Will be decrypted later if needed
            encryptedContent: serverMsg.encrypted_content,
            encryptedKey: serverMsg.encrypted_key,
            iv: serverMsg.iv,
            sentAt: serverMsg.sent_at,
            senderUsername: serverMsg.sender_username,
            status: MESSAGE_STATUS.DELIVERED, // Assume delivered if from server
            isEncrypted: true,
            serverSynced: true
        };

        // Only save if we don't have it locally
        if (!localMessageIds.has(serverMsg.id)) {
            messagesToSave.push(localMessage);
        }
    }

    // Save new messages
    if (messagesToSave.length > 0) {
        console.log('💾 Saving', messagesToSave.length, 'new messages from server');
        for (const message of messagesToSave) {
            await new Promise((resolve, reject) => {
                const request = store.put(message);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
    }

    return messagesToSave.length;
};

// Get conversation metadata
export const getConversation = async (conversationId) => {
    const db = await getDB();
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readonly');
    const store = transaction.objectStore(CONVERSATIONS_STORE);

    return new Promise((resolve, reject) => {
        const request = store.get(conversationId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// Update conversation metadata
export const updateConversation = async (conversationId, updates) => {
    const db = await getDB();
    const transaction = db.transaction([CONVERSATIONS_STORE], 'readwrite');
    const store = transaction.objectStore(CONVERSATIONS_STORE);

    return new Promise((resolve, reject) => {
        const getRequest = store.get(conversationId);
        getRequest.onsuccess = () => {
            const conversation = getRequest.result || { id: conversationId };
            Object.assign(conversation, updates);

            const putRequest = store.put(conversation);
            putRequest.onsuccess = () => resolve(conversation);
            putRequest.onerror = () => reject(putRequest.error);
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
};

// Clear all data (for logout)
export const clearAllData = async () => {
    const db = await getDB();
    const transaction = db.transaction([MESSAGES_STORE, CONVERSATIONS_STORE], 'readwrite');

    return new Promise((resolve, reject) => {
        const clearMessages = transaction.objectStore(MESSAGES_STORE).clear();
        const clearConversations = transaction.objectStore(CONVERSATIONS_STORE).clear();

        let completed = 0;
        const checkComplete = () => {
            completed++;
            if (completed === 2) {
                console.log('🧹 Cleared all local message data');
                resolve();
            }
        };

        clearMessages.onsuccess = checkComplete;
        clearConversations.onsuccess = checkComplete;

        clearMessages.onerror = () => reject(clearMessages.error);
        clearConversations.onerror = () => reject(clearConversations.error);
    });
};

// Debug utilities
export const getDBStats = async () => {
    const db = await getDB();
    const transaction = db.transaction([MESSAGES_STORE, CONVERSATIONS_STORE], 'readonly');

    const messagesStore = transaction.objectStore(MESSAGES_STORE);
    const conversationsStore = transaction.objectStore(CONVERSATIONS_STORE);

    const messageCount = await new Promise(resolve => {
        const request = messagesStore.count();
        request.onsuccess = () => resolve(request.result);
    });

    const conversationCount = await new Promise(resolve => {
        const request = conversationsStore.count();
        request.onsuccess = () => resolve(request.result);
    });

    return {
        messages: messageCount,
        conversations: conversationCount
    };
};