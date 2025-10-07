import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './useAuth';
import { useWebSocket } from './useWebSocket';
import { useWebSocketContext } from '../context/WebSocketContext';
import { 
    storeSentMessage, 
    getSentMessage, 
    getSentMessagesForConversation,
    updateMessageId 
} from '../utils/messageStorage';

const API_BASE_URL = 'http://localhost:8000/api';

export function useMessages(contactId) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { user } = useAuth();
    const { registerMessageHandler, unregisterMessageHandler, sendMessage: sendWebSocketMessage, isConnected } = useWebSocketContext();

    console.log('🚀 useMessages hook called with contactId:', contactId, 'user:', user?.username, 'isConnected:', isConnected);

    // Handle incoming messages from WebSocket
    const handleIncomingMessage = useCallback(async (messageData) => {
        console.log('Incoming message for contactId:', contactId, 'from senderId:', messageData.senderId);
        // Only process messages FROM the contact (not messages we sent TO them)
        if (messageData.senderId === contactId) {
            console.log('Decrypting incoming message...');
            // Decrypt the message
            const decryptedContent = await decryptMessage(
                messageData.encryptedContent,
                messageData.encryptedKey,
                messageData.iv
            );

            const newMessage = {
                id: messageData.id,
                sender_id: messageData.senderId,
                recipient_id: messageData.recipientId,
                content: decryptedContent,
                sent_at: messageData.sentAt,
                sender_username: messageData.senderUsername
            };

            console.log('Adding decrypted message to state:', newMessage);
            setMessages(prev => {
                // Avoid duplicates
                if (prev.some(m => m.id === newMessage.id)) {
                    return prev;
                }
                // Sort messages by sent_at to maintain chronological order
                const updatedMessages = [...prev, newMessage];
                return updatedMessages.sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));
            });
        }
    }, [contactId]);

    // Register/unregister message handler when contactId changes
    useEffect(() => {
        if (contactId) {
            registerMessageHandler(contactId, handleIncomingMessage);
            return () => {
                unregisterMessageHandler(contactId);
            };
        }
    }, [contactId, registerMessageHandler, unregisterMessageHandler, handleIncomingMessage]);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('authToken');
        console.log('🔑 getAuthHeaders called, token exists:', !!token, 'token length:', token?.length);
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    // Hybrid encryption: Generate AES key, encrypt message with AES, encrypt AES key with RSA
    const encryptMessageHybrid = async (message, recipientPublicKey) => {
        try {
            // Generate AES key
            const aesKey = await crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt']
            );

            // Generate IV
            const iv = crypto.getRandomValues(new Uint8Array(12));

            // Encrypt message with AES
            const encodedMessage = new TextEncoder().encode(message);
            const encryptedData = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                aesKey,
                encodedMessage
            );

            // Export AES key
            const exportedKey = await crypto.subtle.exportKey('raw', aesKey);

            // Import recipient's public key
            const recipientKeyObj = JSON.parse(recipientPublicKey);
            console.log('Encrypting with recipient public key algorithm:', recipientKeyObj.alg);
            
            const publicKey = await crypto.subtle.importKey(
                'jwk',
                recipientKeyObj,
                { name: 'RSA-OAEP', hash: 'SHA-256' },
                false,
                ['encrypt']
            );

            // Encrypt AES key with RSA
            const encryptedKey = await crypto.subtle.encrypt(
                { name: 'RSA-OAEP' },
                publicKey,
                exportedKey
            );

            console.log('Message encryption successful');

            return {
                encryptedContent: btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
                encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encryptedKey))),
                iv: btoa(String.fromCharCode(...iv)),
                authTag: null // GCM includes auth tag in encrypted data
            };
        } catch (err) {
            console.error('Encryption failed:', err);
            throw new Error('Failed to encrypt message');
        }
    };

    // Decrypt message using hybrid decryption
    const decryptMessage = async (encryptedContent, encryptedKey, iv) => {
        try {
            if (!encryptedContent || !encryptedKey || !iv) {
                console.error('Missing encryption data:', { encryptedContent: !!encryptedContent, encryptedKey: !!encryptedKey, iv: !!iv });
                throw new Error('Missing encryption data');
            }

            // Get user's private key from localStorage
            const privateKeyData = localStorage.getItem('privateKey');
            if (!privateKeyData) {
                console.error('Private key not found in localStorage');
                throw new Error('Private key not found - please log in again');
            }
            
            const privateKeyJwk = JSON.parse(privateKeyData);
            if (!privateKeyJwk) {
                console.error('Invalid private key format');
                throw new Error('Invalid private key');
            }

            console.log('Attempting decryption with private key for user:', user?.username);

            // Import private key
            const privateKey = await crypto.subtle.importKey(
                'jwk',
                privateKeyJwk,
                { name: 'RSA-OAEP', hash: 'SHA-256' },
                false,
                ['decrypt']
            );

            // Decode base64 encrypted key
            const encryptedKeyData = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));

            // Decrypt AES key with RSA
            const decryptedKeyData = await crypto.subtle.decrypt(
                { name: 'RSA-OAEP' },
                privateKey,
                encryptedKeyData
            );

            // Import AES key
            const aesKey = await crypto.subtle.importKey(
                'raw',
                decryptedKeyData,
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );

            // Decode base64 IV and encrypted content
            const ivData = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
            const encryptedData = Uint8Array.from(atob(encryptedContent), c => c.charCodeAt(0));

            // Decrypt message with AES
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: ivData },
                aesKey,
                encryptedData
            );

            const plainText = new TextDecoder().decode(decrypted);
            console.log('Decryption successful for user:', user?.username, 'message length:', plainText.length);
            return plainText;
        } catch (err) {
            console.error('Decryption failed for user:', user?.username, 'error:', err.message);
            console.error('Error details:', {
                hasPrivateKey: !!localStorage.getItem('privateKey'),
                hasUser: !!user,
                username: user?.username
            });
            return `[Failed to decrypt message: ${err.message}]`;
        }
    };

    const fetchMessages = useCallback(async () => {
        if (!contactId || !user) {
            console.log('📭 fetchMessages skipped - contactId:', contactId, 'user:', !!user, 'username:', user?.username);
            return;
        }

        console.log('📨 fetchMessages called for contactId:', contactId, 'user.id:', user.id, 'user.username:', user.username);
        setLoading(true);
        setError(null);
        
        const headers = getAuthHeaders();
        console.log('📨 Making API request with headers:', Object.keys(headers));
        
        try {
            const response = await axios.get(`${API_BASE_URL}/messages/${contactId}`, {
                headers: headers
            });

            console.log('✅ fetchMessages response:', response.data.messages.length, 'messages');

            // Get ALL messages in this conversation (both sent and received)
            const allMessages = response.data.messages;
            
            // Process messages: decrypt received ones, use stored plain text for sent ones
            const processedMessages = await Promise.all(
                allMessages.map(async (msg) => {
                    // If this is a message we received (recipient_id === user.id), decrypt it
                    if (msg.recipient_id === user.id) {
                        console.log('📨 Decrypting received message from sender:', msg.sender_id);
                        const decryptedContent = await decryptMessage(
                            msg.encrypted_content,
                            msg.encrypted_key,
                            msg.iv
                        );
                        return {
                            ...msg,
                            content: decryptedContent
                        };
                    } else {
                        // This is a message we sent - try to find stored plain text from IndexedDB
                        console.log('📨 Looking for sent message in IndexedDB:', msg.id);
                        const storedMessage = await getSentMessage(msg.id);
                        
                        if (storedMessage && storedMessage.content) {
                            console.log('📨 Using stored plain text for sent message:', msg.id);
                            return {
                                ...msg,
                                content: storedMessage.content
                            };
                        } else {
                            // No stored plain text - this shouldn't happen with our new sendMessage logic
                            console.warn('📨 Sent message without stored plain text:', msg.id);
                            return {
                                ...msg,
                                content: `[Sent message - content not available]`
                            };
                        }
                    }
                })
            );

            console.log('✅ processed messages:', processedMessages.length);

            // Replace all messages for this conversation
            setMessages(processedMessages);
        } catch (err) {
            console.error('❌ fetchMessages error:', err);
            console.error('❌ Error details:', {
                status: err.response?.status,
                statusText: err.response?.statusText,
                data: err.response?.data,
                message: err.message
            });
            setError(err.response?.data?.error || 'Failed to fetch messages');
        } finally {
            setLoading(false);
        }
    }, [contactId, user]);

    // Clear messages when contactId changes
    useEffect(() => {
        setMessages([]);
        setError(null);
    }, [contactId]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    const sendMessage = async (content, recipientPublicKey) => {
        if (!contactId || !content.trim() || !user) return;

        console.log('📤 Sending message. isConnected:', isConnected, 'contactId:', contactId);

        try {
            // Encrypt the message using hybrid encryption (AES + RSA)
            const encryptionResult = await encryptMessageHybrid(content, recipientPublicKey);
            console.log('🔐 Message encrypted successfully');

            // Generate temporary ID
            const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Create the message object for local state (with plain text)
            const tempMessage = {
                id: tempId,
                userId: user.id,
                sender_id: user.id,
                recipient_id: contactId,
                conversationId: contactId,
                content: content, // Store plain text for sent messages
                encrypted_content: encryptionResult.encryptedContent,
                encrypted_key: encryptionResult.encryptedKey,
                iv: encryptionResult.iv,
                sent_at: new Date().toISOString(),
                sender_username: user.username,
                is_temp: true // Mark as temporary until confirmed by server
            };

            // Store in IndexedDB immediately
            await storeSentMessage(tempMessage);
            console.log('💾 Stored message in IndexedDB with temp ID:', tempId);

            // Add to local state immediately for instant UI feedback
            console.log('📤 Adding message to local state:', tempMessage.content.substring(0, 50) + '...');
            setMessages(prev => {
                const updatedMessages = [...prev, tempMessage];
                return updatedMessages.sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));
            });

            // Send via WebSocket if connected, otherwise via HTTP
            if (isConnected) {
                console.log('🌐 Sending via WebSocket...');
                await sendWebSocketMessage(
                    contactId,
                    encryptionResult.encryptedContent,
                    encryptionResult.encryptedKey,
                    encryptionResult.iv,
                    encryptionResult.authTag
                );
            } else {
                console.log('🌐 WebSocket not connected, using HTTP API...');
                // Fallback to HTTP API
                await axios.post(`${API_BASE_URL}/messages/send`, {
                    recipientId: contactId,
                    encryptedContent: encryptionResult.encryptedContent,
                    encryptedKey: encryptionResult.encryptedKey,
                    iv: encryptionResult.iv,
                    authTag: encryptionResult.authTag
                }, {
                    headers: getAuthHeaders()
                });
            }

            console.log('✅ Message sent successfully');

            // Refresh messages from server to get the real message ID
            // The server will return the message with its permanent ID
            setTimeout(async () => {
                console.log('🔄 Refreshing messages to get server ID...');
                await fetchMessages();
                
                // After refresh, try to migrate the temp ID to the permanent ID
                // This is a best-effort migration based on timestamp matching
                const allMessages = messages.filter(m => 
                    m.sender_id === user.id && 
                    m.recipient_id === contactId &&
                    !m.id.startsWith('temp_')
                );
                
                // Find the most recent message that might match our temp message
                const recentMessage = allMessages.find(m => {
                    const timeDiff = Math.abs(new Date(m.sent_at).getTime() - new Date(tempMessage.sent_at).getTime());
                    return timeDiff < 5000; // Within 5 seconds
                });
                
                if (recentMessage && recentMessage.id !== tempId) {
                    console.log('🔄 Migrating temp ID to server ID:', tempId, '->', recentMessage.id);
                    await updateMessageId(tempId, recentMessage.id);
                }
            }, 2000);

            return { success: true };
        } catch (err) {
            console.error('❌ Send message error:', err);
            // Remove the temporary message on error
            setMessages(prev => prev.filter(m => !m.is_temp));
            throw new Error(err.response?.data?.error || 'Failed to send message');
        }
    };

    const deleteMessage = async (messageId) => {
        try {
            await axios.delete(`${API_BASE_URL}/messages/${messageId}`, {
                headers: getAuthHeaders()
            });

            // Update local state
            setMessages(prev => prev.filter(m => m.id !== messageId));
        } catch (err) {
            throw new Error(err.response?.data?.error || 'Failed to delete message');
        }
    };

    return {
        messages,
        loading,
        error,
        sendMessage,
        deleteMessage,
        refreshMessages: fetchMessages
    };
}