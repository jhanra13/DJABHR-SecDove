import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { messagesAPI } from '../utils/api';
import { useAuth } from './AuthContext';
import { useConversations } from './ConversationsContext';
import { useWebSocket } from './WebSocketContext';
import { encryptMessage, decryptMessage } from '../utils/crypto';

const MessagesContext = createContext(null);

export const useMessages = () => {
  const context = useContext(MessagesContext);
  if (!context) throw new Error('useMessages must be used within MessagesProvider');
  return context;
};

const sortByTimestamp = (messages) => [...messages].sort((a, b) => a.timestamp - b.timestamp);

export const MessagesProvider = ({ children }) => {
  const { currentSession } = useAuth();
  const { getContentKey } = useConversations();
  const { connected, on, off, joinConversation } = useWebSocket();
  const [messages, setMessages] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);

  const appendMessage = useCallback((conversationId, message) => {
    setMessages(prev => {
      const list = prev[conversationId] || [];
      if (list.some(item => item.id === message.id)) return prev;
      return {
        ...prev,
        [conversationId]: sortByTimestamp([...list, message])
      };
    });
  }, []);

  const handleRealtimeMessage = useCallback(async (messageData) => {
    const keyData = getContentKey(messageData.conversation_id, messageData.content_key_number);
    if (!keyData) return;
    try {
      const decrypted = await decryptMessage(messageData.encrypted_msg_content, keyData.key);
      appendMessage(messageData.conversation_id, {
        id: messageData.id,
        conversationId: messageData.conversation_id,
        contentKeyNumber: messageData.content_key_number,
        sender: decrypted.sender,
        content: decrypted.content,
        timestamp: decrypted.timestamp,
        created_at: messageData.created_at,
        updated_at: messageData.updated_at
      });
    } catch {
      /* ignore decryption errors */
    }
  }, [appendMessage, getContentKey]);

  useEffect(() => {
    if (!connected) return undefined;
    on('new-message', handleRealtimeMessage);
    return () => off('new-message', handleRealtimeMessage);
  }, [connected, on, off, handleRealtimeMessage]);

  useEffect(() => {
    if (connected && activeConversation) joinConversation(activeConversation);
  }, [connected, activeConversation, joinConversation]);

  const loadMessages = async (conversationId) => {
    if (!currentSession) return;
    const keyData = getContentKey(conversationId);
    if (!keyData) return;
    setActiveConversation(conversationId);
    setLoading(true);
    setError(null);
    try {
      const response = await messagesAPI.getMessages(conversationId);
      const decrypted = await Promise.all(
        (response.messages || []).map(async (msg) => {
          try {
            const keyEntry = getContentKey(conversationId, msg.content_key_number);
            if (!keyEntry) return null;
            const payload = await decryptMessage(msg.encrypted_msg_content, keyEntry.key);
            return {
              id: msg.id,
              conversationId: msg.conversation_id,
              contentKeyNumber: msg.content_key_number,
              sender: payload.sender,
              content: payload.content,
              timestamp: payload.timestamp,
              created_at: msg.created_at,
              updated_at: msg.updated_at
            };
          } catch {
            return null;
          }
        })
      );
      setMessages(prev => ({
        ...prev,
        [conversationId]: sortByTimestamp(decrypted.filter(Boolean))
      }));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (conversationId, content) => {
    if (!currentSession) throw new Error('Not authenticated');
    const keyData = getContentKey(conversationId);
    if (!keyData) throw new Error('No content key for conversation');
    setError(null);
    const messageObj = {
      sender: currentSession.username,
      timestamp: Date.now(),
      content
    };
    try {
      const encrypted = await encryptMessage(messageObj, keyData.key);
      const response = await messagesAPI.sendMessage({
        conversation_id: conversationId,
        content_key_number: keyData.keyNumber,
        encrypted_msg_content: encrypted
      });
      appendMessage(conversationId, {
        id: response.messageData.id,
        conversationId,
        contentKeyNumber: keyData.keyNumber,
        sender: messageObj.sender,
        content: messageObj.content,
        timestamp: messageObj.timestamp,
        created_at: response.messageData.created_at,
        updated_at: response.messageData.updated_at
      });
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const updateMessage = async (conversationId, messageId, newContent) => {
    if (!currentSession) throw new Error('Not authenticated');
    const existingMessages = messages[conversationId] || [];
    const targetMessage = existingMessages.find(msg => msg.id === messageId);
    const keyData = getContentKey(conversationId, targetMessage?.contentKeyNumber);
    if (!keyData) throw new Error('No content key for conversation');
    setError(null);
    try {
      const encrypted = await encryptMessage({
        sender: currentSession.username,
        timestamp: Date.now(),
        content: newContent
      }, keyData.key);
      const response = await messagesAPI.updateMessage(messageId, encrypted);
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map(msg =>
          msg.id === messageId
            ? {
                ...msg,
                content: newContent,
                updated_at: response.messageData.updated_at
              }
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

  const deleteMessage = async (conversationId, messageId) => {
    if (!currentSession) throw new Error('Not authenticated');
    setError(null);
    try {
      await messagesAPI.deleteMessage(messageId);
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

  const clearMessages = (conversationId) => {
    setMessages(prev => {
      const copy = { ...prev };
      delete copy[conversationId];
      return copy;
    });
  };

  return (
    <MessagesContext.Provider
      value={{
        messages,
        loading,
        error,
        loadMessages,
        sendMessage,
        updateMessage,
        deleteMessage,
        getMessages: (conversationId) => messages[conversationId] || [],
        clearMessages
      }}
    >
      {children}
    </MessagesContext.Provider>
  );
};
