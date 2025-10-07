/**
 * IndexedDB Message Storage Utility
 * Provides persistent storage for sent messages using IndexedDB
 */

const DB_NAME = 'SecDoveMessages';
const DB_VERSION = 1;
const SENT_MESSAGES_STORE = 'sentMessages';
const METADATA_STORE = 'metadata';

let dbInstance = null;

/**
 * Initialize IndexedDB
 */
const initDB = () => {
    if (dbInstance) {
        return Promise.resolve(dbInstance);
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('❌ Failed to open IndexedDB:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            dbInstance = request.result;
            console.log('✅ IndexedDB initialized successfully');
            resolve(dbInstance);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            console.log('🔄 Upgrading IndexedDB schema...');

            // Create sent messages store
            if (!db.objectStoreNames.contains(SENT_MESSAGES_STORE)) {
                const sentStore = db.createObjectStore(SENT_MESSAGES_STORE, { keyPath: 'id' });
                sentStore.createIndex('userId', 'userId', { unique: false });
                sentStore.createIndex('conversationId', 'conversationId', { unique: false });
                sentStore.createIndex('sentAt', 'sent_at', { unique: false });
                sentStore.createIndex('userConversation', ['userId', 'conversationId'], { unique: false });
                console.log('✅ Created sentMessages store');
            }

            // Create metadata store
            if (!db.objectStoreNames.contains(METADATA_STORE)) {
                const metaStore = db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
                console.log('✅ Created metadata store');
            }
        };
    });
};

/**
 * Store a sent message in IndexedDB
 */
export const storeSentMessage = async (messageData) => {
    try {
        const db = await initDB();
        const transaction = db.transaction([SENT_MESSAGES_STORE], 'readwrite');
        const store = transaction.objectStore(SENT_MESSAGES_STORE);

        const messageToStore = {
            ...messageData,
            storedAt: Date.now(),
            version: 1
        };

        await new Promise((resolve, reject) => {
            const request = store.put(messageToStore);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        console.log(`📝 Stored sent message in IndexedDB: ${messageData.id}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to store sent message:', error);
        return false;
    }
};

/**
 * Get a specific sent message by ID
 */
export const getSentMessage = async (messageId) => {
    try {
        const db = await initDB();
        const transaction = db.transaction([SENT_MESSAGES_STORE], 'readonly');
        const store = transaction.objectStore(SENT_MESSAGES_STORE);

        const message = await new Promise((resolve, reject) => {
            const request = store.get(messageId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        return message || null;
    } catch (error) {
        console.error('❌ Failed to get sent message:', error);
        return null;
    }
};

/**
 * Get all sent messages for a specific conversation
 */
export const getSentMessagesForConversation = async (userId, conversationId) => {
    try {
        const db = await initDB();
        const transaction = db.transaction([SENT_MESSAGES_STORE], 'readonly');
        const store = transaction.objectStore(SENT_MESSAGES_STORE);
        const index = store.index('userConversation');

        const messages = await new Promise((resolve, reject) => {
            const request = index.getAll([userId, conversationId]);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        console.log(`📨 Retrieved ${messages.length} sent messages for conversation ${conversationId}`);
        return messages;
    } catch (error) {
        console.error('❌ Failed to get sent messages for conversation:', error);
        return [];
    }
};

/**
 * Get all sent messages for a user
 */
export const getAllSentMessagesForUser = async (userId) => {
    try {
        const db = await initDB();
        const transaction = db.transaction([SENT_MESSAGES_STORE], 'readonly');
        const store = transaction.objectStore(SENT_MESSAGES_STORE);
        const index = store.index('userId');

        const messages = await new Promise((resolve, reject) => {
            const request = index.getAll(userId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        console.log(`📨 Retrieved ${messages.length} total sent messages for user ${userId}`);
        return messages;
    } catch (error) {
        console.error('❌ Failed to get all sent messages:', error);
        return [];
    }
};

/**
 * Update a message ID (for migrating temp IDs to server IDs)
 */
export const updateMessageId = async (oldId, newId) => {
    try {
        const db = await initDB();
        const transaction = db.transaction([SENT_MESSAGES_STORE], 'readwrite');
        const store = transaction.objectStore(SENT_MESSAGES_STORE);

        // Get the message with old ID
        const message = await new Promise((resolve, reject) => {
            const request = store.get(oldId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        if (message) {
            // Delete old entry
            await new Promise((resolve, reject) => {
                const request = store.delete(oldId);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            // Add with new ID
            message.id = newId;
            await new Promise((resolve, reject) => {
                const request = store.put(message);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            console.log(`🔄 Migrated message ID from ${oldId} to ${newId}`);
            return true;
        }

        return false;
    } catch (error) {
        console.error('❌ Failed to update message ID:', error);
        return false;
    }
};

/**
 * Delete a specific message
 */
export const deleteSentMessage = async (messageId) => {
    try {
        const db = await initDB();
        const transaction = db.transaction([SENT_MESSAGES_STORE], 'readwrite');
        const store = transaction.objectStore(SENT_MESSAGES_STORE);

        await new Promise((resolve, reject) => {
            const request = store.delete(messageId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        console.log(`🗑️ Deleted message ${messageId}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to delete message:', error);
        return false;
    }
};

/**
 * Clean up old messages (older than specified days)
 */
export const cleanupOldMessages = async (daysOld = 30) => {
    try {
        const db = await initDB();
        const transaction = db.transaction([SENT_MESSAGES_STORE], 'readwrite');
        const store = transaction.objectStore(SENT_MESSAGES_STORE);
        const index = store.index('sentAt');

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        const cutoffTimestamp = cutoffDate.toISOString();

        let deletedCount = 0;

        await new Promise((resolve, reject) => {
            const request = index.openCursor(IDBKeyRange.upperBound(cutoffTimestamp));
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    deletedCount++;
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            
            request.onerror = () => reject(request.error);
        });

        console.log(`🧹 Cleaned up ${deletedCount} messages older than ${daysOld} days`);
        return deletedCount;
    } catch (error) {
        console.error('❌ Failed to cleanup old messages:', error);
        return 0;
    }
};

/**
 * Clear all messages for a specific user
 */
export const clearAllMessagesForUser = async (userId) => {
    try {
        const db = await initDB();
        const transaction = db.transaction([SENT_MESSAGES_STORE], 'readwrite');
        const store = transaction.objectStore(SENT_MESSAGES_STORE);
        const index = store.index('userId');

        let deletedCount = 0;

        await new Promise((resolve, reject) => {
            const request = index.openCursor(IDBKeyRange.only(userId));
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    deletedCount++;
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            
            request.onerror = () => reject(request.error);
        });

        console.log(`🗑️ Cleared ${deletedCount} messages for user ${userId}`);
        return deletedCount;
    } catch (error) {
        console.error('❌ Failed to clear messages:', error);
        return 0;
    }
};

/**
 * Get database statistics
 */
export const getStorageStats = async (userId) => {
    try {
        const db = await initDB();
        const transaction = db.transaction([SENT_MESSAGES_STORE], 'readonly');
        const store = transaction.objectStore(SENT_MESSAGES_STORE);
        const index = store.index('userId');

        const messages = await new Promise((resolve, reject) => {
            const request = index.getAll(userId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        const stats = {
            totalMessages: messages.length,
            oldestMessage: messages.length > 0 ? messages[0].sent_at : null,
            newestMessage: messages.length > 0 ? messages[messages.length - 1].sent_at : null,
            estimatedSize: JSON.stringify(messages).length // Rough estimate in bytes
        };

        return stats;
    } catch (error) {
        console.error('❌ Failed to get storage stats:', error);
        return {
            totalMessages: 0,
            oldestMessage: null,
            newestMessage: null,
            estimatedSize: 0
        };
    }
};

/**
 * Store metadata
 */
export const storeMetadata = async (key, value) => {
    try {
        const db = await initDB();
        const transaction = db.transaction([METADATA_STORE], 'readwrite');
        const store = transaction.objectStore(METADATA_STORE);

        await new Promise((resolve, reject) => {
            const request = store.put({ key, value, updatedAt: Date.now() });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        return true;
    } catch (error) {
        console.error('❌ Failed to store metadata:', error);
        return false;
    }
};

/**
 * Get metadata
 */
export const getMetadata = async (key) => {
    try {
        const db = await initDB();
        const transaction = db.transaction([METADATA_STORE], 'readonly');
        const store = transaction.objectStore(METADATA_STORE);

        const result = await new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        return result?.value || null;
    } catch (error) {
        console.error('❌ Failed to get metadata:', error);
        return null;
    }
};
