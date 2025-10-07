import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { ContactsProvider } from './context/ContactsContext';
import { ConversationsProvider } from './context/ConversationsContext';
import { MessagesProvider } from './context/MessagesContext';
import { ViewProvider } from './context/ViewContext';

console.log('🚀 SecureDove: Starting application...');

try {
    console.log('🔍 SecureDove: Looking for root element...');
    const rootElement = document.getElementById('root');
    
    if (!rootElement) {
        console.error('❌ SecureDove: Root element not found!');
        throw new Error('Root element not found');
    }
    
    console.log('✅ SecureDove: Root element found, creating React root...');
    const root = createRoot(rootElement);
    
    console.log('🎨 SecureDove: Rendering app with providers...');
    root.render(
        <AuthProvider>
            <WebSocketProvider>
                <ContactsProvider>
                    <ConversationsProvider>
                        <MessagesProvider>
                            <ViewProvider>
                                <App />
                            </ViewProvider>
                        </MessagesProvider>
                    </ConversationsProvider>
                </ContactsProvider>
            </WebSocketProvider>
        </AuthProvider>
    );
    
    console.log('✅ SecureDove: App rendered successfully!');
} catch (error) {
    console.error('❌ SecureDove: Fatal error during initialization:', error);
    document.body.innerHTML = `
        <div style="padding: 20px; font-family: monospace;">
            <h1 style="color: red;">SecureDove Error</h1>
            <p><strong>Failed to initialize application:</strong></p>
            <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px;">${error.message}\n\n${error.stack}</pre>
        </div>
    `;
}