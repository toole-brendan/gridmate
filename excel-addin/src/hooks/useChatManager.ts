import { useState, useCallback } from 'react';
import { EnhancedChatMessage } from '../types/enhanced-chat';
import { v4 as uuidv4 } from 'uuid';
import { DiffData } from '../store/useDiffSessionStore';
import { isStreamingMessage, StreamingToolCall } from '../types/streaming';

export const useChatManager = (initialMessages: EnhancedChatMessage[] = []) => {
  const [messages, setMessages] = useState<EnhancedChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [aiIsGenerating, setAiIsGenerating] = useState(false);

  const addMessage = useCallback((message: Partial<EnhancedChatMessage> & { role?: 'user' | 'assistant' | 'system'; content?: string; type?: string }) => {
    // Preserve IDs for special message types
    const preserveIdTypes = ['diff-preview', 'tool-suggestion', 'batch-operation'];
    const shouldPreserveId = message.type && preserveIdTypes.includes(message.type) && message.id;
    const messageId = shouldPreserveId ? message.id : (message.id || uuidv4());
    
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
    
    setMessages(prev => {
      console.log('[ChatManager] Adding message:', { 
        id: newMessage.id, 
        type: newMessage.type || 'chat',
        role: 'role' in newMessage ? newMessage.role : 'unknown',
        isStreaming: 'isStreaming' in newMessage ? newMessage.isStreaming : false,
        contentLength: 'content' in newMessage ? newMessage.content?.length : 0
      });
      console.log('[ChatManager] Previous messages count:', prev.length);
      return [...prev, newMessage];
    });
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

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const updateMessageDiff = useCallback((messageId: string, diffData: Omit<DiffData, 'messageId'>) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, diff: diffData } : msg
      )
    );
  }, []);

  // Streaming-specific methods
  
  // Update streaming message content
  const updateStreamingMessage = useCallback((messageId: string, updates: any) => {
    setMessages(prev => {
      console.log('[ChatManager] Updating streaming message:', messageId);
      console.log('[ChatManager] Current messages:', prev.map(m => ({ id: m.id, content: m.content?.substring(0, 50) })));
      
      const updated = prev.map(msg => {
        if (msg.id === messageId) {
          const updated = { ...msg };
          
          // Handle content updates
          if ('content' in updates) {
            const oldContent = msg.content || '';
            updated.content = typeof updates.content === 'function' 
              ? updates.content(oldContent) 
              : updates.content;
            console.log('[ChatManager] Content update:', { 
              messageId, 
              oldLength: oldContent.length, 
              newLength: updated.content.length,
              delta: updated.content.length - oldContent.length
            });
          }
          
          // Handle other updates
          Object.keys(updates).forEach(key => {
            if (key !== 'content') {
              (updated as any)[key] = updates[key];
            }
          });
          
          return updated;
        }
        return msg;
      });
      
      return updated;
    });
  }, []);

  // Add tool indicator to streaming message
  const addToolIndicator = useCallback((messageId: string, toolCall: StreamingToolCall) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && isStreamingMessage(msg)) {
        const toolCalls = msg.toolCalls || [];
        return {
          ...msg,
          toolCalls: [...toolCalls, toolCall]
        };
      }
      return msg;
    }));
  }, []);

  // Update tool progress
  const updateToolProgress = useCallback((messageId: string, toolId: string, progress: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && isStreamingMessage(msg) && msg.toolCalls) {
        return {
          ...msg,
          toolCalls: msg.toolCalls.map(tool =>
            tool.id === toolId 
              ? { ...tool, progress } 
              : tool
          )
        };
      }
      return msg;
    }));
  }, []);

  // Complete tool call
  const completeToolCall = useCallback((messageId: string, toolId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && isStreamingMessage(msg) && msg.toolCalls) {
        return {
          ...msg,
          toolCalls: msg.toolCalls.map(tool =>
            tool.id === toolId 
              ? { ...tool, status: 'complete' as const, endTime: Date.now() } 
              : tool
          )
        };
      }
      return msg;
    }));
  }, []);

  // Finalize streaming message
  const finalizeStreamingMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && isStreamingMessage(msg)) {
        return {
          ...msg,
          isStreaming: false,
          streamEndTime: Date.now()
        };
      }
      return msg;
    }));
  }, []);

  return {
    messages,
    setMessages,
    addMessage,
    updateMessage,
    updateMessageDiff,
    removeMessage,
    clearThinkingMessages,
    clearMessages,
    isLoading,
    setIsLoading,
    aiIsGenerating,
    setAiIsGenerating,
    // Streaming methods
    updateStreamingMessage,
    addToolIndicator,
    updateToolProgress,
    completeToolCall,
    finalizeStreamingMessage,
  };
}; 