/**
 * Message Backup and Restore Utility with PIN Encryption
 * Allows users to backup their sent messages with a PIN and restore them later
 */

import { getAllSentMessagesForUser, storeSentMessage, clearAllMessagesForUser } from './messageStorage';

/**
 * Derive an encryption key from a PIN using PBKDF2
 */
const derivePINKey = async (pin, salt) => {
    const encoder = new TextEncoder();
    const pinData = encoder.encode(pin);

    // Import PIN as key material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        pinData,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    // Derive AES key from PIN
    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );

    return key;
};

/**
 * Encrypt data with a PIN
 */
const encryptWithPIN = async (data, pin) => {
    try {
        // Generate random salt and IV
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));

        // Derive key from PIN
        const key = await derivePINKey(pin, salt);

        // Encrypt data
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(JSON.stringify(data));
        const encryptedData = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            encodedData
        );

        // Return encrypted data with salt and IV
        return {
            salt: btoa(String.fromCharCode(...salt)),
            iv: btoa(String.fromCharCode(...iv)),
            data: btoa(String.fromCharCode(...new Uint8Array(encryptedData)))
        };
    } catch (error) {
        console.error('❌ Encryption failed:', error);
        throw new Error('Failed to encrypt data');
    }
};

/**
 * Decrypt data with a PIN
 */
const decryptWithPIN = async (encryptedPackage, pin) => {
    try {
        // Decode salt and IV
        const salt = Uint8Array.from(atob(encryptedPackage.salt), c => c.charCodeAt(0));
        const iv = Uint8Array.from(atob(encryptedPackage.iv), c => c.charCodeAt(0));
        const encryptedData = Uint8Array.from(atob(encryptedPackage.data), c => c.charCodeAt(0));

        // Derive key from PIN
        const key = await derivePINKey(pin, salt);

        // Decrypt data
        const decryptedData = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            encryptedData
        );

        // Parse JSON
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(decryptedData);
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('❌ Decryption failed:', error);
        throw new Error('Failed to decrypt data - incorrect PIN or corrupted data');
    }
};

/**
 * Create a backup of all sent messages for a user
 */
export const createBackup = async (userId, pin) => {
    try {
        console.log('🔐 Creating backup for user:', userId);

        // Validate PIN
        if (!pin || pin.length < 4) {
            throw new Error('PIN must be at least 4 characters');
        }

        // Get all sent messages
        const messages = await getAllSentMessagesForUser(userId);

        if (messages.length === 0) {
            throw new Error('No messages to backup');
        }

        // Create backup package
        const backupData = {
            version: 1,
            userId: userId,
            createdAt: new Date().toISOString(),
            messageCount: messages.length,
            messages: messages.map(msg => ({
                id: msg.id,
                userId: msg.userId,
                conversationId: msg.conversationId,
                content: msg.content,
                sent_at: msg.sent_at,
                recipient_id: msg.recipient_id,
                sender_id: msg.sender_id,
                sender_username: msg.sender_username
            }))
        };

        // Encrypt with PIN
        const encryptedBackup = await encryptWithPIN(backupData, pin);

        // Add metadata
        const backupPackage = {
            ...encryptedBackup,
            version: 1,
            userId: userId,
            createdAt: backupData.createdAt,
            messageCount: backupData.messageCount
        };

        console.log(`✅ Backup created with ${messages.length} messages`);
        return backupPackage;
    } catch (error) {
        console.error('❌ Failed to create backup:', error);
        throw error;
    }
};

/**
 * Restore messages from a backup
 */
export const restoreBackup = async (backupPackage, pin, userId) => {
    try {
        console.log('🔓 Restoring backup for user:', userId);

        // Validate backup package
        if (!backupPackage || !backupPackage.salt || !backupPackage.iv || !backupPackage.data) {
            throw new Error('Invalid backup file');
        }

        // Decrypt backup
        const backupData = await decryptWithPIN(backupPackage, pin);

        // Validate backup data
        if (backupData.userId !== userId) {
            throw new Error('This backup belongs to a different user');
        }

        if (!backupData.messages || backupData.messages.length === 0) {
            throw new Error('No messages found in backup');
        }

        // Store each message
        let restoredCount = 0;
        let failedCount = 0;

        for (const message of backupData.messages) {
            const success = await storeSentMessage(message);
            if (success) {
                restoredCount++;
            } else {
                failedCount++;
            }
        }

        console.log(`✅ Restored ${restoredCount} messages (${failedCount} failed)`);

        return {
            success: true,
            restoredCount,
            failedCount,
            totalMessages: backupData.messages.length
        };
    } catch (error) {
        console.error('❌ Failed to restore backup:', error);
        throw error;
    }
};

/**
 * Export backup as downloadable file
 */
export const exportBackupToFile = (backupPackage, userId) => {
    try {
        const backupJson = JSON.stringify(backupPackage, null, 2);
        const blob = new Blob([backupJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `secdove-backup-${userId}-${timestamp}.json`;

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();

        URL.revokeObjectURL(url);
        console.log(`✅ Backup exported to ${filename}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to export backup:', error);
        return false;
    }
};

/**
 * Import backup from file
 */
export const importBackupFromFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const backupPackage = JSON.parse(event.target.result);
                
                // Validate backup structure
                if (!backupPackage.salt || !backupPackage.iv || !backupPackage.data) {
                    reject(new Error('Invalid backup file format'));
                    return;
                }

                console.log(`✅ Backup file loaded: ${backupPackage.messageCount} messages`);
                resolve(backupPackage);
            } catch (error) {
                console.error('❌ Failed to parse backup file:', error);
                reject(new Error('Invalid backup file - not a valid JSON'));
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read backup file'));
        };

        reader.readAsText(file);
    });
};

/**
 * Verify PIN without restoring (for testing PIN)
 */
export const verifyBackupPIN = async (backupPackage, pin) => {
    try {
        await decryptWithPIN(backupPackage, pin);
        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Get backup info without decrypting
 */
export const getBackupInfo = (backupPackage) => {
    return {
        userId: backupPackage.userId,
        createdAt: backupPackage.createdAt,
        messageCount: backupPackage.messageCount,
        version: backupPackage.version
    };
};
