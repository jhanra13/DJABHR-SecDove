import { createContext, useContext, useState, useEffect } from 'react';
import { useAuthContext } from './AuthContext';

const ViewContext = createContext(null);

export const VIEWS = {
    MESSAGES: 'messages',
    PROFILE: 'profile',
    SETTINGS: 'settings',
    CONTACTS: 'contacts'
};

export function ViewProvider({ children }) {
    const [currentView, setCurrentView] = useState(VIEWS.MESSAGES);
    const { user } = useAuthContext();

    // Reset to messages view when user logs out
    useEffect(() => {
        if (!user) {
            setCurrentView(VIEWS.MESSAGES);
        }
    }, [user]);

    return (
        <ViewContext.Provider value={{ currentView, setCurrentView }}>
            {children}
        </ViewContext.Provider>
    );
}

export function useViewContext() {
    const context = useContext(ViewContext);
    if (!context) {
        throw new Error('useViewContext must be used within ViewProvider');
    }
    return context;
}