// Phase 3.3: Conversation Flow with Content Key Management
import React, { createContext, useContext, useState, useEffect } from 'react';
import { conversationsAPI, contactsAPI } from '../utils/api';
import { useAuth } from './AuthContext';
import {
  generateContentKey,
  exportContentKey,
  importContentKey,
  encryptContentKey,
  decryptContentKey,
  importPublicKey
} from '../utils/crypto';

const ConversationsContext = createContext();

export const useConversations = () => {
  const context = useContext(ConversationsContext);
  if (!context) {
    throw new Error('useConversations must be used within ConversationsProvider');
  }
  return context;
};

export const ConversationsProvider = ({ children }) => {
  const { currentSession } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [contentKeyCache, setContentKeyCache] = useState({}); // { conversationId: { keyNumber, key } }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load conversations when authenticated
  useEffect(() => {
    if (currentSession?.privateKey) {
      loadConversations();
    } else {
      setConversations([]);
      setContentKeyCache({});
    }
  }, [currentSession]);

  // Phase 3.3: Load and decrypt conversations
  const loadConversations = async () => {
    if (!currentSession?.privateKey) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await conversationsAPI.getConversations();
      const convos = response.conversations || [];
      
      // Decrypt content keys for each conversation
      const cache = {};
      const formattedConvos = [];
      
      for (const convo of convos) {
        try {
          const contentKey = await decryptContentKey(
            convo.encrypted_content_key,
            currentSession.privateKey
          );
          
          cache[convo.id] = {
            keyNumber: convo.content_key_number,
            key: contentKey
          };
          
          // Format conversation for display
          // Filter out current user from participants for display name
          const otherParticipants = convo.participants.filter(
            p => p !== currentSession.username
          );
          
          formattedConvos.push({
            ...convo,
            name: otherParticipants.length > 0 
              ? otherParticipants.join(', ') 
              : 'You',
            message: 'Start a conversation',
            time: new Date(convo.created_at).toLocaleDateString(),
            avatarUrl: '/default-avatar.png',
            isOnline: false
          });
        } catch (err) {
          console.error(`Failed to decrypt key for conversation ${convo.id}:`, err);
        }
      }
      
      setContentKeyCache(cache);
      setConversations(formattedConvos);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      console.error('Load conversations error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Phase 3.3: Create conversation with content key encryption
  const createConversation = async (participantUsernames) => {
    if (!currentSession?.privateKey) throw new Error('Not authenticated');
    
    setError(null);
    
    try {
      // Add current user if not included
      if (!participantUsernames.includes(currentSession.username)) {
        participantUsernames.push(currentSession.username);
      }
      
      // Sort participants for consistent comparison
      const sortedParticipants = [...participantUsernames].sort();
      
      // Check for duplicate conversation (same participants)
      const existingConvo = conversations.find(convo => {
        if (!convo.participants) return false;
        const existingSorted = [...convo.participants].sort();
        return existingSorted.length === sortedParticipants.length &&
               existingSorted.every((p, i) => p === sortedParticipants[i]);
      });
      
      if (existingConvo) {
        // Return existing conversation instead of creating duplicate
        return { success: true, conversation: existingConvo, isExisting: true };
      }
      
      // Validate participants exist and get public keys
      const publicKeys = {};
      for (const username of participantUsernames) {
        if (username === currentSession.username) {
          publicKeys[username] = currentSession.publicKey;
        } else {
          try {
            const response = await contactsAPI.getPublicKey(username);
            publicKeys[username] = response.public_key;
          } catch (err) {
            if (err.response?.status === 404) {
              throw new Error(`User ${username} not found`);
            }
            throw err;
          }
        }
      }
      
      // Generate serial conversation ID (timestamp-based)
      const conversationId = Date.now();
      
      // Generate content key
      const contentKey = await generateContentKey();
      const contentKeyNumber = 1;
      
      // Encrypt content key for each participant
      const entries = [];
      for (const username of participantUsernames) {
        const publicKey = await importPublicKey(publicKeys[username]);
        const encryptedContentKey = await encryptContentKey(contentKey, publicKey);
        
        entries.push({
          id: conversationId,
          content_key_number: contentKeyNumber,
          username: username,
          encrypted_content_key: encryptedContentKey
        });
      }
      
      // Create conversation on server
      const response = await conversationsAPI.createConversation(entries);
      
      // Cache content key
      setContentKeyCache(prev => ({
        ...prev,
        [conversationId]: {
          keyNumber: contentKeyNumber,
          key: contentKey
        }
      }));
      
      // Format conversation for display
      const otherParticipants = participantUsernames.filter(
        u => u !== currentSession.username
      );
      
      // Add to local conversations
      const newConvo = {
        id: conversationId,
        content_key_number: contentKeyNumber,
        encrypted_content_key: entries.find(e => e.username === currentSession.username).encrypted_content_key,
        participants: participantUsernames,
        created_at: Date.now(),
        name: otherParticipants.length > 0 
          ? otherParticipants.join(', ') 
          : 'You',
        message: 'Start a conversation',
        time: new Date().toLocaleDateString(),
        avatarUrl: '/default-avatar.png',
        isOnline: false
      };
      
      setConversations(prev => [newConvo, ...prev]);
      
      return { success: true, conversation: newConvo };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  // Get content key for conversation
  const getContentKey = (conversationId) => {
    return contentKeyCache[conversationId];
  };

  // Get conversation by ID
  const getConversation = (conversationId) => {
    return conversations.find(c => c.id === conversationId);
  };

  // Delete conversation
  const deleteConversation = async (conversationId) => {
    if (!currentSession) throw new Error('Not authenticated');
    
    setError(null);
    
    try {
      await conversationsAPI.deleteConversation(conversationId);
      
      // Remove from local state
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      // Remove from cache
      setContentKeyCache(prev => {
        const newCache = { ...prev };
        delete newCache[conversationId];
        return newCache;
      });
      
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const value = {
    conversations,
    loading,
    error,
    loadConversations,
    createConversation,
    getContentKey,
    getConversation,
    deleteConversation
  };

  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  );
};
