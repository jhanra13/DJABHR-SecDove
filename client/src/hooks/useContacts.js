import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

export function useContacts() {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('authToken');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const fetchContacts = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_BASE_URL}/contacts`, {
                headers: getAuthHeaders()
            });
            setContacts(response.data.contacts);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch contacts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (token) {
            fetchContacts();
        }
    }, []);

    const addNewContact = async (username) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/contacts`, {
                username
            }, {
                headers: getAuthHeaders()
            });

            // Refresh contacts list
            await fetchContacts();
            return response.data;
        } catch (err) {
            throw new Error(err.response?.data?.error || 'Failed to add contact');
        }
    };

    const deleteContact = async (contactId) => {
        try {
            await axios.delete(`${API_BASE_URL}/contacts/${contactId}`, {
                headers: getAuthHeaders()
            });

            // Update local state
            setContacts(prev => prev.filter(c => c.id !== contactId));
        } catch (err) {
            throw new Error(err.response?.data?.error || 'Failed to delete contact');
        }
    };

    const blockContact = async (contactId) => {
        try {
            await axios.patch(`${API_BASE_URL}/contacts/${contactId}/block`, {
                blocked: true
            }, {
                headers: getAuthHeaders()
            });

            // Update local state
            setContacts(prev => prev.map(c =>
                c.id === contactId ? { ...c, is_blocked: 1 } : c
            ));
        } catch (err) {
            throw new Error(err.response?.data?.error || 'Failed to block contact');
        }
    };

    return {
        contacts,
        loading,
        error,
        addNewContact,
        deleteContact,
        blockContact,
        refreshContacts: fetchContacts
    };
}