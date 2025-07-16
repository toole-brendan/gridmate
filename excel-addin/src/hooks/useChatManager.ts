import { useState, useCallback } from 'react';
import { EnhancedChatMessage } from '../types/enhanced-chat';
import { v4 as uuidv4 } from 'uuid';

export const useChatManager = (initialMessages: EnhancedChatMessage[] = []) => {
  const [messages, setMessages] = useState<EnhancedChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [aiIsGenerating, setAiIsGenerating] = useState(false);

  const addMessage = useCallback((message: Partial<EnhancedChatMessage> & { role?: 'user' | 'assistant' | 'system'; content?: string; type?: string }) => {
    const messageId = uuidv4();
    
    // Create a new message based on whether it has a type field or not
    let newMessage: EnhancedChatMessage;
    
    if (message.type && message.type !== 'user' && message.type !== 'assistant' && message.type !== 'system') {
      // It's one of the special message types
      newMessage = {
        ...message,
        id: messageId,
      } as EnhancedChatMessage;
    } else {
      // It's a regular ChatMessage
      const role = message.role || (message.type as 'user' | 'assistant' | 'system') || 'user';
      newMessage = {
        id: messageId,
        role,
        content: message.content || '',
        timestamp: new Date(),
        ...message,
      } as EnhancedChatMessage;
    }
    
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const updateMessage = useCallback((messageId: string, updates: Partial<EnhancedChatMessage>) => {
    setMessages(prev => prev.map(msg => {
      if ('id' in msg && msg.id === messageId) {
        return { ...msg, ...updates } as EnhancedChatMessage;
      }
      return msg;
    }));
  }, []);
  
  const removeMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => !('id' in msg) || msg.id !== messageId));
  }, []);

  const clearThinkingMessages = useCallback(() => {
    setMessages(prev => prev.filter(msg => {
      // Check if it's a ChatMessage with assistant role
      if ('role' in msg && msg.role === 'assistant' && 'content' in msg) {
        return !(msg.content.includes('thinking') || msg.content.includes('...'));
      }
      return true;
    }));
  }, []);

  return {
    messages,
    setMessages,
    addMessage,
    updateMessage,
    removeMessage,
    clearThinkingMessages,
    isLoading,
    setIsLoading,
    aiIsGenerating,
    setAiIsGenerating,
  };
}; 