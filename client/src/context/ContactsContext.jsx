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

  useEffect(() => {
    if (currentSession) {
      loadContacts();
    } else {
      setContacts([]);
    }
  }, [currentSession]);

  const loadContacts = async () => {
    if (!currentSession) return;
    setLoading(true);
    setError(null);
    try {
      const response = await contactsAPI.getContacts();
      setContacts(response.contacts || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const addContact = async (contactUsername) => {
    if (!currentSession) throw new Error('Not authenticated');
    setError(null);
    try {
      await contactsAPI.getPublicKey(contactUsername);
      const response = await contactsAPI.addContact(contactUsername);
      setContacts(prev => [...prev, response.contact]);
      return { success: true, contact: response.contact };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const removeContact = async (contactId) => {
    if (!currentSession) throw new Error('Not authenticated');
    setError(null);
    try {
      await contactsAPI.deleteContact(contactId);
      setContacts(prev => prev.filter(c => c.id !== contactId));
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const getContactByUsername = (username) => {
    return contacts.find(c => c.contact_username === username);
  };

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
