import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { ContactsProvider } from './context/ContactsContext';
import { ViewProvider } from './context/ViewContext';

const root = createRoot(document.getElementById('root'));
root.render(
    <WebSocketProvider>
        <AuthProvider>
            <ContactsProvider>
                <ViewProvider>
                    <App />
                </ViewProvider>
            </ContactsProvider>
        </AuthProvider>
    </WebSocketProvider>
);