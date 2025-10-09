import { useContext } from 'react';
import { ConversationsContext } from '../context/ConversationsContext';

export const useConversations = () => {
  const context = useContext(ConversationsContext);
  
  if (!context) {
    throw new Error('useConversations must be used within ConversationsProvider');
  }
  
  return context;
};
