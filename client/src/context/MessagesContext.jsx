// Phase 3.4: Messaging Flow with Encryption/Decryption
import React, { createContext, useContext, useState, useEffect } from 'react';
import { messagesAPI } from '../utils/api';
import { useAuth } from './AuthContext';
import { useConversations } from './ConversationsContext';
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
  const [messages, setMessages] = useState({}); // { conversationId: [messages] }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Phase 3.4: Load and decrypt messages for a conversation
  const loadMessages = async (conversationId) => {
    if (!currentSession) return;
    
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
      
      // Add to local messages
      const newMessage = {
        id: response.messageData.id,
        conversationId: conversationId,
        sender: messageObj.sender,
        content: messageObj.content,
        timestamp: messageObj.timestamp,
        created_at: response.messageData.created_at
      };
      
      setMessages(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), newMessage]
      }));
      
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

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  );
};
