// Message Backup Utilities for SecureDove
// Handles exporting and importing encrypted message backups

import { getStoredMessages, getStoredMetadata, saveMessages, saveMetadata } from './messageStorage';

/**
 * Create a backup of all encrypted messages and metadata
 * @param {string} password - Password to encrypt the backup (optional)
 * @returns {Object} Backup object
 */
export const createBackup = async (password = null) => {
  try {
    const messages = getStoredMessages();
    const metadata = getStoredMetadata();
    
    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      messages,
      metadata
    };

    // If password provided, we could add encryption here
    // For now, the messages are already encrypted client-side
    
    return backup;
  } catch (error) {
    console.error('Failed to create backup:', error);
    throw new Error('Failed to create backup');
  }
};

/**
 * Export backup to JSON file
 * @param {Object} backup - Backup object
 * @param {string} filename - Filename for the export
 */
export const exportBackup = (backup, filename = null) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultFilename = `securedove-backup-${timestamp}.json`;
    const exportFilename = filename || defaultFilename;
    
    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Failed to export backup:', error);
    throw new Error('Failed to export backup');
  }
};

/**
 * Import backup from JSON file
 * @param {File} file - File object from input
 * @returns {Promise<Object>} Parsed backup object
 */
export const importBackup = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target.result);
        
        // Validate backup structure
        if (!backup.version || !backup.messages || !backup.metadata) {
          throw new Error('Invalid backup format');
        }
        
        resolve(backup);
      } catch (error) {
        console.error('Failed to parse backup:', error);
        reject(new Error('Failed to parse backup file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read backup file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Restore backup to local storage
 * @param {Object} backup - Backup object
 * @param {boolean} merge - Whether to merge with existing data or replace
 * @returns {boolean} Success status
 */
export const restoreBackup = (backup, merge = false) => {
  try {
    if (merge) {
      // Merge with existing data
      const existingMessages = getStoredMessages();
      const existingMetadata = getStoredMetadata();
      
      const mergedMessages = { ...existingMessages, ...backup.messages };
      const mergedMetadata = { ...existingMetadata, ...backup.metadata };
      
      Object.keys(mergedMessages).forEach(conversationId => {
        saveMessages(conversationId, mergedMessages[conversationId]);
      });
      
      Object.keys(mergedMetadata).forEach(conversationId => {
        saveMetadata(conversationId, mergedMetadata[conversationId]);
      });
    } else {
      // Replace all data
      Object.keys(backup.messages).forEach(conversationId => {
        saveMessages(conversationId, backup.messages[conversationId]);
      });
      
      Object.keys(backup.metadata).forEach(conversationId => {
        saveMetadata(conversationId, backup.metadata[conversationId]);
      });
    }
    
    return true;
  } catch (error) {
    console.error('Failed to restore backup:', error);
    throw new Error('Failed to restore backup');
  }
};

/**
 * Create and download backup in one step
 */
export const createAndExportBackup = async () => {
  try {
    const backup = await createBackup();
    exportBackup(backup);
    return true;
  } catch (error) {
    console.error('Failed to create and export backup:', error);
    throw error;
  }
};

/**
 * Import and restore backup in one step
 * @param {File} file - File object from input
 * @param {boolean} merge - Whether to merge with existing data
 */
export const importAndRestoreBackup = async (file, merge = false) => {
  try {
    const backup = await importBackup(file);
    restoreBackup(backup, merge);
    return true;
  } catch (error) {
    console.error('Failed to import and restore backup:', error);
    throw error;
  }
};
