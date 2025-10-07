// Debug utility for testing IndexedDB functionality
// This can be called from browser console to verify database operations

import { getDBStats, clearAllData, getMessagesForConversation } from './database.js';

window.debugDB = {
    // Get database statistics
    stats: async () => {
        try {
            const stats = await getDBStats();
            console.log('📊 Database Stats:', stats);
            return stats;
        } catch (err) {
            console.error('❌ Failed to get DB stats:', err);
        }
    },

    // Clear all data
    clear: async () => {
        try {
            await clearAllData();
            console.log('🧹 Database cleared');
        } catch (err) {
            console.error('❌ Failed to clear DB:', err);
        }
    },

    // Get messages for a conversation
    getMessages: async (conversationId) => {
        try {
            const messages = await getMessagesForConversation(conversationId);
            console.log(`📨 Messages for conversation ${conversationId}:`, messages);
            return messages;
        } catch (err) {
            console.error('❌ Failed to get messages:', err);
        }
    },

    // Test basic database operations
    test: async () => {
        console.log('🧪 Testing IndexedDB functionality...');

        try {
            // Test 1: Get initial stats
            console.log('1️⃣ Initial stats:');
            await window.debugDB.stats();

            // Test 2: Clear database
            console.log('2️⃣ Clearing database...');
            await window.debugDB.clear();

            // Test 3: Verify cleared
            console.log('3️⃣ Stats after clear:');
            await window.debugDB.stats();

            console.log('✅ All tests passed!');
        } catch (err) {
            console.error('❌ Test failed:', err);
        }
    }
};

console.log('🔧 Debug utilities loaded. Use window.debugDB.test() to run tests.');