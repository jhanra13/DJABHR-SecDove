import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { conversationsAPI, contactsAPI } from '../utils/api';
import { useAuth } from './AuthContext';
import {
  generateContentKey,
  encryptContentKey,
  decryptContentKey,
  importPublicKey
} from '../utils/crypto';
import { useWebSocket } from './WebSocketContext';

const ConversationsContext = createContext();

export const useConversations = () => {
  const context = useContext(ConversationsContext);
  if (!context) {
    throw new Error('useConversations must be used within ConversationsProvider');
  }
  return context;
};

const buildDisplayName = (participants, username) => {
  const others = (participants || []).filter(p => p !== username);
  return others.length ? others.join(', ') : 'You';
};

export const ConversationsProvider = ({ children }) => {
  const { currentSession } = useAuth();
  const { on, off } = useWebSocket();
  const [conversations, setConversations] = useState([]);
  const [contentKeyCache, setContentKeyCache] = useState({}); // { id: { latest, keys: { [number]: CryptoKey } } }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const publicKeyCache = useRef(new Map());

  // Load conversations when authenticated
  const resetState = () => {
    setConversations([]);
    setContentKeyCache({});
    publicKeyCache.current.clear();
  };

  const loadConversations = useCallback(async () => {
    if (!currentSession?.privateKey) return;

    setLoading(true);
    setError(null);

    try {
      const response = await conversationsAPI.getConversations();
      const convos = response.conversations || [];

      const cache = {};
      const formattedConvos = [];

      for (const convo of convos) {
        const keyEntries = Array.isArray(convo.keys) && convo.keys.length
          ? convo.keys
          : [{ content_key_number: convo.content_key_number, encrypted_content_key: convo.encrypted_content_key }];

        const keyMap = {};
        let latest = 0;

        for (const entry of keyEntries) {
          try {
            const key = await decryptContentKey(entry.encrypted_content_key, currentSession.privateKey);
            keyMap[entry.content_key_number] = key;
            if (entry.content_key_number > latest) latest = entry.content_key_number;
          } catch {
            // ignore keys that fail to decrypt
          }
        }

        if (!latest) continue;

        cache[convo.id] = { latest, keys: keyMap };

        formattedConvos.push({
          ...convo,
          participants: Array.from(new Set(convo.participants || [])),
          name: buildDisplayName(convo.participants || [], currentSession.username),
          message: 'Start a conversation',
          time: new Date(convo.created_at).toLocaleDateString(),
          avatarUrl: '/default-avatar.png',
          isOnline: false
        });
      }

      setContentKeyCache(cache);
      setConversations(formattedConvos);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [currentSession?.privateKey, currentSession?.username]);

  useEffect(() => {
    if (currentSession?.privateKey) {
      loadConversations();
    } else {
      resetState();
    }
  }, [currentSession, loadConversations]);

  useEffect(() => {
    if (!currentSession?.privateKey) return undefined;
    const refresh = () => loadConversations();
    const events = ['conversation-created', 'conversation-updated', 'conversation-participants-added', 'conversation-participants-removed', 'conversation-key-rotated', 'conversation-joined'];
    events.forEach(event => on(event, refresh));
    return () => {
      events.forEach(event => off(event, refresh));
    };
  }, [currentSession?.privateKey, on, off, loadConversations]);

  const getPublicKeyHex = async (username) => {
    if (username === currentSession.username) return currentSession.publicKey;
    if (publicKeyCache.current.has(username)) {
      return publicKeyCache.current.get(username);
    }
    const response = await contactsAPI.getPublicKey(username);
    publicKeyCache.current.set(username, response.public_key);
    return response.public_key;
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
        try {
          publicKeys[username] = await getPublicKeyHex(username);
        } catch (err) {
          if (err.response?.status === 404) {
            throw new Error(`User ${username} not found`);
          }
          throw err;
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
          latest: contentKeyNumber,
          keys: { [contentKeyNumber]: contentKey }
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

  const getContentKey = (conversationId, keyNumber) => {
    const entry = contentKeyCache[conversationId];
    if (!entry) return null;
    if (typeof keyNumber === 'number' && entry.keys[keyNumber]) {
      return { keyNumber, key: entry.keys[keyNumber] };
    }
    if (entry.latest && entry.keys[entry.latest]) {
      return { keyNumber: entry.latest, key: entry.keys[entry.latest] };
    }
    return null;
  };

  const leaveConversation = async (conversationId) => {
    if (!currentSession) throw new Error('Not authenticated');
    setError(null);
    try {
      await conversationsAPI.deleteConversation(conversationId);
      setConversations(prev => prev.filter(convo => convo.id !== conversationId));
      setContentKeyCache(prev => {
        const copy = { ...prev };
        delete copy[conversationId];
        return copy;
      });
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  // Get conversation by ID
  const getConversation = (conversationId) => {
    return conversations.find(c => c.id === conversationId);
  };

  const addParticipants = async (conversationId, usernames, shareHistory) => {
    if (!currentSession?.privateKey) throw new Error('Not authenticated');

    setError(null);

    try {
      const targetConversation = conversations.find(c => c.id === conversationId);
      if (!targetConversation) throw new Error('Conversation not found');

      const uniqueNewUsers = Array.from(new Set((usernames || []).filter(Boolean)));
      if (uniqueNewUsers.length === 0) throw new Error('Select at least one contact');

      if (shareHistory) {
        const cacheEntry = contentKeyCache[conversationId];
        if (!cacheEntry || !cacheEntry.keys) throw new Error('No content key history available');
        const keyNumbers = Object.keys(cacheEntry.keys).map(Number).sort((a, b) => a - b);
        if (keyNumbers.length === 0) throw new Error('No content key available');

        const entries = await Promise.all(
          uniqueNewUsers.map(async (username) => {
            const publicKeyHex = await getPublicKeyHex(username);
            const publicKey = await importPublicKey(publicKeyHex);
            const keys = await Promise.all(
              keyNumbers.map(async (number) => ({
                content_key_number: number,
                encrypted_content_key: await encryptContentKey(cacheEntry.keys[number], publicKey)
              }))
            );
            return { username, keys };
          })
        );

        await conversationsAPI.addParticipants(conversationId, {
          share_history: true,
          entries
        });

        setConversations(prev => prev.map(convo =>
          convo.id === conversationId
            ? {
                ...convo,
                participants: Array.from(new Set([...(convo.participants || []), ...uniqueNewUsers])),
                name: buildDisplayName([...(convo.participants || []), ...uniqueNewUsers], currentSession.username)
              }
            : convo
        ));

        await loadConversations();
        return { success: true };
      }

      const cacheEntry = contentKeyCache[conversationId];
      const latestNumber = cacheEntry?.latest || 0;
      const newKeyNumber = latestNumber + 1;
      const newContentKey = await generateContentKey();

      const participantSet = new Set([...(targetConversation.participants || []), ...uniqueNewUsers]);
      const entries = [];

      for (const participant of participantSet) {
        const publicKeyHex = await getPublicKeyHex(participant);
        const publicKey = await importPublicKey(publicKeyHex);
        const encryptedContentKey = await encryptContentKey(newContentKey, publicKey);
        entries.push({ username: participant, encrypted_content_key: encryptedContentKey });
      }

      await conversationsAPI.addParticipants(conversationId, {
        share_history: false,
        content_key_number: newKeyNumber,
        entries
      });

      setContentKeyCache(prev => {
        const existing = prev[conversationId] || { latest: 0, keys: {} };
        return {
          ...prev,
          [conversationId]: {
            latest: newKeyNumber,
            keys: {
              ...existing.keys,
              [newKeyNumber]: newContentKey
            }
          }
        };
      });

      setConversations(prev => prev.map(convo =>
        convo.id === conversationId
          ? {
              ...convo,
              participants: Array.from(participantSet),
              content_key_number: newKeyNumber,
              name: buildDisplayName(Array.from(participantSet), currentSession.username)
            }
          : convo
      ));

      await loadConversations();
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      setError(errorMsg);
      throw new Error(errorMsg);
    }
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
    deleteConversation,
    leaveConversation,
    addParticipants
  };

  return (
    <ConversationsContext.Provider value={value}>
      {children}
    </ConversationsContext.Provider>
  );
};
