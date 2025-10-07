import { useState, useEffect } from 'react';
import axios from 'axios';
import { useWebSocketContext } from '../context/WebSocketContext';

const API_BASE_URL = 'http://localhost:8000/api';

export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const webSocketContext = useWebSocketContext();
    const connectWebSocket = webSocketContext?.connect;

    // Auto-login with token verification
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        console.log('🔄 Auto-login check - token exists:', !!token, 'user state:', !!user);
        if (token && !user) {
            console.log('🔄 Starting token verification...');
            verifyToken(token);
        } else if (!token) {
            console.log('🔄 No token found, user not logged in');
        } else if (user) {
            console.log('🔄 User already logged in:', user.username);
        }
    }, [user]);

    const verifyToken = async (token) => {
        try {
            console.log('🔐 Verifying token for auto-login...');
            const response = await axios.get(`${API_BASE_URL}/auth/verify`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const userData = response.data.user;
            console.log('✅ Token verified for user:', userData.username);
            setUser(userData);
            localStorage.setItem('authToken', token);

            // CRITICAL: Restore the correct private key for this user
            const userPrivateKey = localStorage.getItem(`privateKey_${userData.username}`);
            console.log('🔑 Checking for private key:', `privateKey_${userData.username}`, 'exists:', !!userPrivateKey);

            if (userPrivateKey) {
                localStorage.setItem('privateKey', userPrivateKey);
                console.log('✅ Private key restored for user:', userData.username);
            } else {
                console.warn('⚠️ Private key not found for user:', userData.username);
                console.log('Available keys in localStorage:', Object.keys(localStorage).filter(key => key.startsWith('privateKey_')));
                // DON'T clear the token - user is still authenticated with server
                // Just clear the current private key so they know they can't decrypt
                localStorage.removeItem('privateKey');
                console.warn('⚠️ User will need to re-register or restore their private key to decrypt messages');
            }

            // Connect to WebSocket after successful verification
            if (connectWebSocket) {
                console.log('🔌 Connecting to WebSocket...');
                connectWebSocket(token);
            }
        } catch (error) {
            console.error('❌ Token verification failed:', error.response?.data || error.message);
            console.error('❌ Error status:', error.response?.status);
            console.error('❌ Error details:', error);
            console.error('❌ Full error object:', JSON.stringify(error, null, 2));
            // Token invalid, clear it
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            localStorage.removeItem('privateKey');
            setUser(null);
        }
    };

    const login = async (username, password) => {
        console.log('🔐 Attempting login for user:', username);
        setLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/login`, {
                username,
                password
            });

            const { user, token } = response.data;
            console.log('✅ Login successful for user:', user.username);
            setUser(user);
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify(user));

            // CRITICAL: Store private key for the logged-in user
            const userPrivateKey = localStorage.getItem(`privateKey_${username}`);
            console.log('🔑 Checking for private key:', `privateKey_${username}`, 'exists:', !!userPrivateKey);
            
            if (userPrivateKey) {
                localStorage.setItem('privateKey', userPrivateKey);
                console.log('✅ Private key set for user:', username);
            } else {
                console.error('❌ Private key not found for user:', username);
                console.log('Available keys in localStorage:', Object.keys(localStorage).filter(key => key.startsWith('privateKey_')));
                throw new Error('Private key not found. Please register this account.');
            }

            // Connect to WebSocket
            if (connectWebSocket) {
                console.log('🔌 Connecting to WebSocket...');
                connectWebSocket(token);
            }

            return { token };
        } catch (error) {
            console.error('❌ Login failed:', error.response?.data?.error || error.message);
            throw new Error(error.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const register = async (username, password) => {
        setLoading(true);
        try {
            // Generate key pair for encryption
            const keyPair = await generateKeyPair();

            const response = await axios.post(`${API_BASE_URL}/auth/register`, {
                username,
                password,
                publicKey: keyPair.publicKey
            });

            // Store private key securely (in a real app, this should be encrypted with user password)
            localStorage.setItem(`privateKey_${username}`, JSON.stringify(keyPair.privateKey));

            console.log('User registered successfully');
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        console.log('🚪 Logout called - disconnecting user:', user?.username);
        // Disconnect WebSocket first
        if (webSocketContext?.disconnect) {
            webSocketContext.disconnect();
        }

        // Clear user state
        setUser(null);

        // Only clear current session data, NOT all private keys
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('privateKey'); // Only current user's active key

        console.log('✅ User logged out, session cleared. Private keys preserved.');
    };

    const generateKeyPair = async () => {
        // Generate RSA key pair for encryption
        const keyPair = await crypto.subtle.generateKey(
            {
                name: 'RSA-OAEP',
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: 'SHA-256'
            },
            true,
            ['encrypt', 'decrypt']
        );

        // Export keys as JWK for easier storage
        const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
        const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
        
        // Add algorithm for JWK
        publicKeyJwk.alg = 'RSA-OAEP-256';
        privateKeyJwk.alg = 'RSA-OAEP-256';

        return {
            publicKey: JSON.stringify(publicKeyJwk),
            privateKey: privateKeyJwk
        };
    };

    return {
        user,
        loading,
        login,
        register,
        logout
    };
}