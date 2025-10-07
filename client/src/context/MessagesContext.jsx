// Phase 3.4: Messaging Flow with Encryption/Decryption + Real-time Updates
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { messagesAPI } from '../utils/api';
import { useAuth } from './AuthContext';
import { useConversations } from './ConversationsContext';
import { useWebSocket } from './WebSocketContext';
import { encryptMessage, decryptMessage } from '../utils/crypto';

const MessagesContext = createContext();

export const useMessages = () => {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error('useMessages must be used within MessagesProvider');
  }
  return context;
};

export const MessagesProvider = ({ children }) => {
  const { currentSession } = useAuth();
  const { getContentKey } = useConversations();
  const { connected, on, off, joinConversation } = useWebSocket();
  const [messages, setMessages] = useState({}); // { conversationId: [messages] }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);

  // Handle incoming real-time messages
  const handleNewMessage = useCallback(async (messageData) => {
    console.log('📨 Received new message:', messageData);
    console.log('🔑 Looking for content key for conversation:', messageData.conversation_id);
    
    const contentKeyData = getContentKey(messageData.conversation_id);
    if (!contentKeyData) {
      console.error('❌ No content key for conversation:', messageData.conversation_id);
      return;
    }

    console.log('✅ Content key found, decrypting message...');

    try {
      // Decrypt the message
      const decrypted = await decryptMessage(
        messageData.encrypted_msg_content,
        contentKeyData.key
      );

      console.log('✅ Message decrypted:', { sender: decrypted.sender, timestamp: decrypted.timestamp });

      const newMessage = {
        id: messageData.id,
        conversationId: messageData.conversation_id,
        sender: decrypted.sender,
        content: decrypted.content,
        timestamp: decrypted.timestamp,
        created_at: messageData.created_at,
        updated_at: messageData.updated_at
      };

      // Add to messages state with duplicate prevention
      setMessages(prev => {
        const existingMessages = prev[messageData.conversation_id] || [];
        
        // Check if message already exists (prevent duplicates)
        const messageExists = existingMessages.some(msg => msg.id === messageData.id);
        if (messageExists) {
          console.log('📋 Message already exists, skipping duplicate:', messageData.id);
          return prev;
        }

        // Add new message and sort by timestamp to maintain order
        const updatedMessages = [...existingMessages, newMessage].sort((a, b) => a.timestamp - b.timestamp);
        
        const updated = {
          ...prev,
          [messageData.conversation_id]: updatedMessages
        };
        console.log('✅ Updated messages state for conversation:', messageData.conversation_id);
        console.log('📊 Total messages now:', updatedMessages.length);
        return updated;
      });

      console.log('✅ Added real-time message to state');
    } catch (err) {
      console.error('❌ Failed to decrypt real-time message:', err);
    }
  }, [getContentKey]);

  // Set up WebSocket listener for new messages
  useEffect(() => {
    if (connected) {
      console.log('👂 Setting up new-message listener');
      on('new-message', handleNewMessage);

      return () => {
        console.log('🔇 Removing new-message listener');
        off('new-message', handleNewMessage);
      };
    }
  }, [connected, on, off, handleNewMessage]);

  // Join conversation room when active conversation changes
  useEffect(() => {
    if (activeConversation && connected) {
      console.log('🚪 Joining conversation room:', activeConversation);
      joinConversation(activeConversation);
    } else if (activeConversation && !connected) {
      console.warn('⚠️ Cannot join conversation room - WebSocket not connected');
    }
  }, [activeConversation, connected, joinConversation]);

  // Phase 3.4: Load and decrypt messages for a conversation
  const loadMessages = async (conversationId) => {
    if (!currentSession) return;
    
    // Set as active conversation for WebSocket room
    setActiveConversation(conversationId);
    
    const contentKeyData = getContentKey(conversationId);
    if (!contentKeyData) {
      console.error('No content key for conversation:', conversationId);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await messagesAPI.getMessages(conversationId);
      const encryptedMessages = response.messages || [];
      
      // Decrypt messages
      const decryptedMessages = [];
      for (const msg of encryptedMessages) {
        try {
          const decrypted = await decryptMessage(
            msg.encrypted_msg_content,
            contentKeyData.key
          );
          
          decryptedMessages.push({
            id: msg.id,
            conversationId: msg.conversation_id,
            sender: decrypted.sender,
            content: decrypted.content,
            timestamp: decrypted.timestamp,
            created_at: msg.created_at,
            updated_at: msg.updated_at
          });
        } catch (err) {
          console.error(`Failed to decrypt message ${msg.id}:`, err);
        }
      }
      
      // Sort by timestamp
      decryptedMessages.sort((a, b) => a.timestamp - b.timestamp);
      
      setMessages(prev => ({
        ...prev,
        [conversationId]: decryptedMessages
      }));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      console.error('Load messages error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Phase 3.4: Send encrypted message
  const sendMessage = async (conversationId, content) => {
    if (!currentSession) throw new Error('Not authenticated');
    
    const contentKeyData = getContentKey(conversationId);
    if (!contentKeyData) {
      throw new Error('No content key for conversation');
    }
    
    setError(null);
    
    try {
      // Create message object
      const messageObj = {
        sender: currentSession.username,
        timestamp: Date.now(),
        content: content
      };
      
      // Encrypt message
      const encryptedContent = await encryptMessage(messageObj, contentKeyData.key);
      
      // Send to server
      const response = await messagesAPI.sendMessage({
        conversation_id: conversationId,
        content_key_number: contentKeyData.keyNumber,
        encrypted_msg_content: encryptedContent
      });
      
      // Add to local messages immediately for better UX
      const newMessage = {
        id: response.messageData.id,
        conversationId: conversationId,
        sender: messageObj.sender,
        content: messageObj.content,
        timestamp: messageObj.timestamp,
        created_at: response.messageData.created_at
      };
      
      setMessages(prev => {
        const existingMessages = prev[conversationId] || [];
        
        // Check if message already exists (prevent duplicates)
        const messageExists = existingMessages.some(msg => msg.id === response.messageData.id);
        if (messageExists) {
          console.log('📋 Message already exists in local state, skipping duplicate:', response.messageData.id);
          return prev;
        }

        // Add new message and sort by timestamp to maintain order
        const updatedMessages = [...existingMessages, newMessage].sort((a, b) => a.timestamp - b.timestamp);
        
        console.log('✅ Added sent message to local state:', response.messageData.id);
        
        return {
          ...prev,
          [conversationId]: updatedMessages
        };
      });
      
      return { success: true, message: newMessage };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  // Phase 3.4: Update message
  const updateMessage = async (conversationId, messageId, newContent) => {
    if (!currentSession) throw new Error('Not authenticated');
    
    const contentKeyData = getContentKey(conversationId);
    if (!contentKeyData) {
      throw new Error('No content key for conversation');
    }
    
    setError(null);
    
    try {
      // Create updated message object
      const messageObj = {
        sender: currentSession.username,
        timestamp: Date.now(),
        content: newContent
      };
      
      // Encrypt message
      const encryptedContent = await encryptMessage(messageObj, contentKeyData.key);
      
      // Update on server
      const response = await messagesAPI.updateMessage(messageId, encryptedContent);
      
      // Update local messages
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map(msg =>
          msg.id === messageId
            ? { ...msg, content: newContent, updated_at: response.messageData.updated_at }
            : msg
        )
      }));
      
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  // Phase 3.4: Delete message
  const deleteMessage = async (conversationId, messageId) => {
    if (!currentSession) throw new Error('Not authenticated');
    
    setError(null);
    
    try {
      await messagesAPI.deleteMessage(messageId);
      
      // Remove from local messages
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).filter(msg => msg.id !== messageId)
      }));
      
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  // Get messages for conversation
  const getMessages = (conversationId) => {
    return messages[conversationId] || [];
  };

  // Clear messages for conversation
  const clearMessages = (conversationId) => {
    setMessages(prev => {
      const newMessages = { ...prev };
      delete newMessages[conversationId];
      return newMessages;
    });
  };

  const value = {
    messages,
    loading,
    error,
    loadMessages,
    sendMessage,
    updateMessage,
    deleteMessage,
    getMessages,
    clearMessages
  };

  // Expose for debugging
  if (typeof window !== 'undefined') {
    window.__messages_debug__ = {
      messages,
      connected,
      activeConversation,
      messageCount: Object.keys(messages).length
    };
  }

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  );
};
