// WebSocket Context for Real-time Communication using Socket.IO
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

console.log('🌐 WebSocketContext: Module loaded');

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  console.log('🌐 WebSocketProvider: Initializing...');
  const { currentSession } = useAuth();
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const eventHandlersRef = useRef(new Map());

  // Connect/disconnect socket based on authentication
  useEffect(() => {
    if (!currentSession?.token) {
      // Disconnect if no session
      if (socketRef.current) {
        console.log('🔌 Disconnecting socket - no session');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
      return;
    }

    // Connect Socket.IO
    console.log('🔌 Connecting to Socket.IO server...');
    const socket = io('http://localhost:8000', {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', socket.id);
      setConnected(true);
      
      // Authenticate the socket connection
      socket.emit('authenticate', currentSession.token);
    });

    socket.on('authenticated', (data) => {
      if (data.success) {
        console.log('✅ Socket authenticated');
      } else {
        console.error('❌ Socket authentication failed:', data.error);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
      setConnected(false);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
    });

    // Cleanup on unmount or session change
    return () => {
      console.log('🔌 Cleaning up socket connection');
      if (socket) {
        socket.disconnect();
      }
    };
  }, [currentSession?.token]);

  // Function to subscribe to events
  const on = (event, handler) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
      
      // Store handler reference for cleanup
      if (!eventHandlersRef.current.has(event)) {
        eventHandlersRef.current.set(event, []);
      }
      eventHandlersRef.current.get(event).push(handler);
    }
  };

  // Function to unsubscribe from events
  const off = (event, handler) => {
    if (socketRef.current) {
      socketRef.current.off(event, handler);
      
      // Remove from stored handlers
      const handlers = eventHandlersRef.current.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    }
  };

  // Function to emit events
  const emit = (event, data) => {
    if (socketRef.current && connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Cannot emit - socket not connected');
    }
  };

  // Function to join a conversation room
  const joinConversation = (conversationId) => {
    if (socketRef.current && connected) {
      console.log('📥 Joining conversation:', conversationId);
      socketRef.current.emit('join-conversation', conversationId);
    }
  };

  // Function to leave a conversation room
  const leaveConversation = (conversationId) => {
    if (socketRef.current && connected) {
      console.log('📤 Leaving conversation:', conversationId);
      socketRef.current.emit('leave-conversation', conversationId);
    }
  };

  const value = {
    connected,
    socket: socketRef.current,
    on,
    off,
    emit,
    joinConversation,
    leaveConversation
  };

  // Expose for debugging
  if (typeof window !== 'undefined') {
    window.__websocket__ = value;
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
