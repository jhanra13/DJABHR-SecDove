import { useContext } from 'react';
import { MessagesContext } from '../context/MessagesContext';

export const useMessages = () => {
  const context = useContext(MessagesContext);
  
  if (!context) {
    throw new Error('useMessages must be used within MessagesProvider');
  }
  
  return context;
};
