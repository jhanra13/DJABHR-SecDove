import { createContext, useContext } from 'react';
import { useContacts } from '../hooks/useContacts';

const ContactsContext = createContext(null);

export function ContactsProvider({ children }) {
    const contacts = useContacts();

    return (
        <ContactsContext.Provider value={contacts}>
            {children}
        </ContactsContext.Provider>
    );
}

export function useContactsContext() {
    const context = useContext(ContactsContext);
    if (!context) {
        throw new Error('useContactsContext must be used within ContactsProvider');
    }
    return context;
}