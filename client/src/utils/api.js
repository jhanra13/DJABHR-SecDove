// API client for backend communication
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============= Authentication APIs =============

export const authAPI = {
  register: async (userData) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },
  
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },
  
  getUser: async () => {
    const response = await apiClient.get('/auth/user');
    return response.data;
  },
  
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  checkUsername: async (username) => {
    const response = await apiClient.get(`/auth/check-username/${encodeURIComponent(username)}`);
    return response.data;
  }
};

// ============= Contacts APIs =============

export const contactsAPI = {
  addContact: async (contactUsername) => {
    const response = await apiClient.post('/contacts', { contact_username: contactUsername });
    return response.data;
  },
  
  getContacts: async () => {
    const response = await apiClient.get('/contacts');
    return response.data;
  },
  
  deleteContact: async (contactId) => {
    const response = await apiClient.delete(`/contacts/${contactId}`);
    return response.data;
  },
  
  getPublicKey: async (username) => {
    const response = await apiClient.get(`/contacts/${username}/public-key`);
    return response.data;
  }
};

// ============= Conversations APIs =============

export const conversationsAPI = {
  createConversation: async (conversationEntries) => {
    const response = await apiClient.post('/conversations', { conversation_entries: conversationEntries });
    return response.data;
  },
  
  getConversations: async () => {
    const response = await apiClient.get('/conversations');
    return response.data;
  },
  
  getConversation: async (conversationId) => {
    const response = await apiClient.get(`/conversations/${conversationId}`);
    return response.data;
  },
  
  deleteConversation: async (conversationId) => {
    const response = await apiClient.delete(`/conversations/${conversationId}`);
    return response.data;
  }
};

// ============= Messages APIs =============

export const messagesAPI = {
  sendMessage: async (messageData) => {
    const response = await apiClient.post('/messages', messageData);
    return response.data;
  },
  
  getMessages: async (conversationId, limit = 50, offset = 0) => {
    const response = await apiClient.get(`/messages/${conversationId}`, {
      params: { limit, offset }
    });
    return response.data;
  },
  
  updateMessage: async (messageId, encryptedContent) => {
    const response = await apiClient.put(`/messages/${messageId}`, { encrypted_msg_content: encryptedContent });
    return response.data;
  },
  
  deleteMessage: async (messageId) => {
    const response = await apiClient.delete(`/messages/${messageId}`);
    return response.data;
  },
  
  getRecentMessages: async (limit = 20) => {
    const response = await apiClient.get('/messages/recent/all', {
      params: { limit }
    });
    return response.data;
  }
};

export default apiClient;
