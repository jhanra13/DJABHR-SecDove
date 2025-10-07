import { createContext, useContext, useState, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

const WebSocketContext = createContext(null);

// Global message dispatcher
class MessageDispatcher {
    constructor() {
        this.handlers = new Map(); // contactId -> callback
    }

    registerHandler(contactId, callback) {
        this.handlers.set(contactId, callback);
    }

    unregisterHandler(contactId) {
        this.handlers.delete(contactId);
    }

    dispatchMessage(message) {
        // Dispatch to specific contact handler if registered
        // WebSocket messages use senderId/recipientId (camelCase)
        const handler = this.handlers.get(message.senderId) || this.handlers.get(message.recipientId);
        if (handler) {
            handler(message);
        }
    }
}

const messageDispatcher = new MessageDispatcher();

export function WebSocketProvider({ children }) {
    console.log('WebSocketProvider component mounting at', new Date().toISOString());
    console.trace('WebSocketProvider initialization stack trace');
    
    const handleIncomingMessage = (message) => {
        console.log('WebSocketProvider - Incoming message, dispatching to handlers');
        messageDispatcher.dispatchMessage(message);
    };

    const ws = useWebSocket(handleIncomingMessage);

    const registerMessageHandler = (contactId, callback) => {
        console.log('Registering message handler for contact:', contactId);
        messageDispatcher.registerHandler(contactId, callback);
    };

    const unregisterMessageHandler = (contactId) => {
        console.log('Unregistering message handler for contact:', contactId);
        messageDispatcher.unregisterHandler(contactId);
    };

    console.log('WebSocketProvider - ws object created, isConnected:', ws?.isConnected);

    return (
        <WebSocketContext.Provider value={{
            ...ws,
            registerMessageHandler,
            unregisterMessageHandler
        }}>
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebSocketContext() {
    const context = useContext(WebSocketContext);
    return context;
}