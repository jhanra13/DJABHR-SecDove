import { useState, useEffect, useMemo } from 'react';
import { useContacts } from './useContacts';

export function useConversations() {
    const { contacts, loading: contactsLoading } = useContacts();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    // Convert contacts to conversations format
    const derivedConversations = useMemo(() => {
        return contacts.map(contact => ({
            id: contact.contact_id, // Use the actual user ID for messaging
            contactRecordId: contact.id, // Keep the contact record ID
            name: contact.nickname || contact.contact_username,
            message: 'Click to start chatting...', // Default message
            time: '', // Could be last message time
            avatarUrl: '', // Could be profile picture
            isOnline: false, // Could be online status
            contact_username: contact.contact_username,
            public_key: contact.public_key // For encryption
        }));
    }, [contacts]);

    useEffect(() => {
        setConversations(derivedConversations);
        setLoading(contactsLoading);
    }, [derivedConversations, contactsLoading]);

    return {
        conversations,
        loading,
        setConversations
    };
}