import React, { createContext, useContext, useState } from 'react';

export const VIEWS = {
  DISCUSSIONS: 'discussions',
  CONTACTS: 'contacts',
  SETTINGS: 'settings'
};

const ViewContext = createContext();

export const useViewContext = () => {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error('useViewContext must be used within ViewProvider');
  }
  return context;
};

export const ViewProvider = ({ children }) => {
  const [currentView, setCurrentView] = useState(VIEWS.DISCUSSIONS);
  const [selectedConversation, setSelectedConversation] = useState(null);

  const switchView = (view) => {
    if (Object.values(VIEWS).includes(view)) {
      setCurrentView(view);
    }
  };

  const selectConversation = (conversationId) => {
    setSelectedConversation(conversationId);
    setCurrentView(VIEWS.DISCUSSIONS);
  };

  const clearConversation = () => {
    setSelectedConversation(null);
  };

  const value = {
    currentView,
    selectedConversation,
    switchView,
    selectConversation,
    clearConversation,
    VIEWS
  };

  return (
    <ViewContext.Provider value={value}>
      {children}
    </ViewContext.Provider>
  );
};
