// Message Storage Utilities for SecureDove
// Handles local storage of encrypted messages and metadata

const STORAGE_PREFIX = 'securedove_';
const MESSAGES_KEY = `${STORAGE_PREFIX}messages`;
const METADATA_KEY = `${STORAGE_PREFIX}metadata`;

/**
 * Save encrypted messages to local storage
 * @param {string} conversationId - Conversation identifier
 * @param {Array} messages - Array of encrypted messages
 */
export const saveMessages = (conversationId, messages) => {
  try {
    const stored = getStoredMessages();
    stored[conversationId] = messages;
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(stored));
    return true;
  } catch (error) {
    console.error('Failed to save messages:', error);
    return false;
  }
};

/**
 * Get all stored messages
 * @returns {Object} Object with conversation IDs as keys
 */
export const getStoredMessages = () => {
  try {
    const stored = localStorage.getItem(MESSAGES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to retrieve messages:', error);
    return {};
  }
};

/**
 * Get messages for a specific conversation
 * @param {string} conversationId - Conversation identifier
 * @returns {Array} Array of encrypted messages
 */
export const getConversationMessages = (conversationId) => {
  const stored = getStoredMessages();
  return stored[conversationId] || [];
};

/**
 * Delete messages for a specific conversation
 * @param {string} conversationId - Conversation identifier
 */
export const deleteConversationMessages = (conversationId) => {
  try {
    const stored = getStoredMessages();
    delete stored[conversationId];
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(stored));
    return true;
  } catch (error) {
    console.error('Failed to delete messages:', error);
    return false;
  }
};

/**
 * Clear all stored messages
 */
export const clearAllMessages = () => {
  try {
    localStorage.removeItem(MESSAGES_KEY);
    localStorage.removeItem(METADATA_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear messages:', error);
    return false;
  }
};

/**
 * Save metadata (conversation info, last read timestamps, etc.)
 * @param {string} conversationId - Conversation identifier
 * @param {Object} metadata - Metadata object
 */
export const saveMetadata = (conversationId, metadata) => {
  try {
    const stored = getStoredMetadata();
    stored[conversationId] = {
      ...stored[conversationId],
      ...metadata,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(METADATA_KEY, JSON.stringify(stored));
    return true;
  } catch (error) {
    console.error('Failed to save metadata:', error);
    return false;
  }
};

/**
 * Get all stored metadata
 * @returns {Object} Object with conversation IDs as keys
 */
export const getStoredMetadata = () => {
  try {
    const stored = localStorage.getItem(METADATA_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to retrieve metadata:', error);
    return {};
  }
};

/**
 * Get metadata for a specific conversation
 * @param {string} conversationId - Conversation identifier
 * @returns {Object} Metadata object
 */
export const getConversationMetadata = (conversationId) => {
  const stored = getStoredMetadata();
  return stored[conversationId] || {};
};

/**
 * Get storage usage information
 * @returns {Object} Storage usage stats
 */
export const getStorageInfo = () => {
  try {
    const messages = localStorage.getItem(MESSAGES_KEY) || '';
    const metadata = localStorage.getItem(METADATA_KEY) || '';
    const totalSize = messages.length + metadata.length;
    const messagesSize = messages.length;
    const metadataSize = metadata.length;
    
    return {
      totalSize,
      messagesSize,
      metadataSize,
      totalSizeKB: (totalSize / 1024).toFixed(2),
      messagesSizeKB: (messagesSize / 1024).toFixed(2),
      metadataSizeKB: (metadataSize / 1024).toFixed(2)
    };
  } catch (error) {
    console.error('Failed to get storage info:', error);
    return null;
  }
};
