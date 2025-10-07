// Phase 3.2: Contact Management with API Integration
import React, { createContext, useContext, useState, useEffect } from 'react';
import { contactsAPI } from '../utils/api';
import { useAuth } from './AuthContext';

const ContactsContext = createContext();

export const useContacts = () => {
  const context = useContext(ContactsContext);
  if (!context) {
    throw new Error('useContacts must be used within ContactsProvider');
  }
  return context;
};

export const ContactsProvider = ({ children }) => {
  const { currentSession } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load contacts when authenticated
  useEffect(() => {
    if (currentSession) {
      loadContacts();
    } else {
      setContacts([]);
    }
  }, [currentSession]);

  // Phase 3.2: Get all contacts
  const loadContacts = async () => {
    if (!currentSession) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await contactsAPI.getContacts();
      setContacts(response.contacts || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      console.error('Load contacts error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Phase 3.2: Add contact with username validation
  const addContact = async (contactUsername) => {
    if (!currentSession) throw new Error('Not authenticated');
    
    setError(null);
    
    try {
      // Check if contact username exists
      try {
        await contactsAPI.getPublicKey(contactUsername);
      } catch (err) {
        if (err.response?.status === 404) {
          throw new Error('User not found');
        }
        throw err;
      }

      // Add contact
      const response = await contactsAPI.addContact(contactUsername);
      
      // Update local state
      setContacts(prev => [...prev, response.contact]);
      
      return { success: true, contact: response.contact };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  // Phase 3.2: Remove contact
  const removeContact = async (contactId) => {
    if (!currentSession) throw new Error('Not authenticated');
    
    setError(null);
    
    try {
      await contactsAPI.deleteContact(contactId);
      
      // Update local state
      setContacts(prev => prev.filter(c => c.id !== contactId));
      
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  // Get contact by username
  const getContactByUsername = (username) => {
    return contacts.find(c => c.contact_username === username);
  };

  // Check if user is a contact
  const isContact = (username) => {
    return contacts.some(c => c.contact_username === username);
  };

  const value = {
    contacts,
    loading,
    error,
    loadContacts,
    addContact,
    removeContact,
    getContactByUsername,
    isContact
  };

  return (
    <ContactsContext.Provider value={value}>
      {children}
    </ContactsContext.Provider>
  );
};
