import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:8000';

export function useWebSocket(onMessageReceived) {
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);

    console.log('useWebSocket hook initialized - socket not created yet');

    useEffect(() => {
        console.log('useWebSocket useEffect running - no socket to disconnect yet');
        return () => {
            console.log('useWebSocket cleanup - disconnecting socket if exists');
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, []);

    const connect = (token) => {
        console.log('connect() called with token:', token ? 'present' : 'MISSING');
        console.trace('connect() call stack trace');
        if (!token) {
            console.error('Cannot connect: No token provided');
            return;
        }

        // Validate token format (should be JWT with 3 parts)
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
            console.error('Cannot connect: Invalid token format');
            return;
        }

        // Disconnect any existing connection
        if (socketRef.current) {
            console.log('Disconnecting existing socket');
            socketRef.current.disconnect();
            socketRef.current = null;
        }

        console.log('Creating new Socket.IO instance with valid token');
        // Create socket instance only when connecting
        socketRef.current = io(SOCKET_URL, {
            autoConnect: false,  // Explicitly set to false
            reconnection: false, // Disable reconnection to prevent auto-connect
            timeout: 20000
        });

        socketRef.current.on('connect', () => {
            console.log('Connected to server');
            // Authenticate with server immediately after connection
            socketRef.current.emit('authenticate', { token });
        });

        socketRef.current.on('authenticated', (data) => {
            console.log('Authenticated with server:', data.user);
            setIsConnected(true);
        });

        socketRef.current.on('auth_error', (error) => {
            console.error('Authentication error:', error);
            setIsConnected(false);
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        });

        socketRef.current.on('message:receive', (message) => {
            console.log('Received message:', message);
            // Call the callback to handle the message (decryption will happen in useMessages)
            if (onMessageReceived) {
                onMessageReceived(message);
            }
        });

        socketRef.current.on('message:sent', (confirmation) => {
            console.log('Message sent confirmation:', confirmation);
        });

        socketRef.current.on('disconnect', () => {
            console.log('Disconnected from server');
            setIsConnected(false);
        });

        socketRef.current.on('error', (error) => {
            console.error('Socket error:', error);
        });

        // Now connect
        console.log('Calling socket.connect()...');
        socketRef.current.connect();
    };

    const disconnect = () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        setIsConnected(false);
    };

    const sendMessage = async (recipientId, encryptedContent, encryptedKey, iv, authTag) => {
        if (!isConnected || !socketRef.current) {
            throw new Error('Not connected to server');
        }

        return new Promise((resolve, reject) => {
            socketRef.current.emit('message:send', {
                recipientId,
                encryptedContent,
                encryptedKey,
                iv,
                authTag
            }, (response) => {
                if (response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response);
                }
            });
        });
    };

    return {
        isConnected,
        connect,
        disconnect,
        sendMessage
    };
}