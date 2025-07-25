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
        type: ('type' in newMessage && newMessage.type) || 'user',
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
    console.log('[ChatManager] updateMessage called:', {
      messageId,
      updateKeys: Object.keys(updates),
      timestamp: new Date().toISOString()
    });
    
    setMessages(prev => prev.map(msg => {
      if ('id' in msg && msg.id === messageId) {
        console.log('[ChatManager] Found message to update:', {
          messageId,
          currentContent: 'content' in msg ? msg.content?.substring(0, 50) : 'N/A',
          currentType: 'type' in msg ? msg.type : 'role' in msg ? msg.role : 'unknown'
        });
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
    const updateTimestamp = new Date().toISOString();
    console.log('[ChatManager] updateStreamingMessage START:', {
      timestamp: updateTimestamp,
      messageId,
      updateKeys: Object.keys(updates),
      hasContentUpdate: 'content' in updates,
      contentUpdateType: 'content' in updates ? typeof updates.content : 'N/A'
    });
    
    setMessages(prev => {
      console.log('[ChatManager] Current messages before update:', {
        timestamp: updateTimestamp,
        messageCount: prev.length,
        messages: prev.map(m => ({ 
          id: m.id, 
          type: 'type' in m ? m.type : 'role' in m ? m.role : 'unknown',
          isStreaming: 'isStreaming' in m ? m.isStreaming : false,
          contentLength: 'content' in m ? m.content?.length : 0,
          contentPreview: 'content' in m ? m.content?.substring(0, 30) : 'N/A'
        }))
      });
      
      const updated = prev.map(msg => {
        if (msg.id === messageId) {
          console.log('[ChatManager] Found message to update:', {
            timestamp: updateTimestamp,
            messageId,
            currentContentLength: 'content' in msg ? msg.content?.length : 0,
            isStreaming: 'isStreaming' in msg ? msg.isStreaming : false
          });
          
          const updated = { ...msg };
          
          // Handle content updates
          if ('content' in updates) {
            const oldContent = 'content' in msg ? msg.content || '' : '';
            const contentUpdateFn = updates.content;
            
            if (typeof contentUpdateFn === 'function') {
              console.log('[ChatManager] Calling content update function:', {
                timestamp: updateTimestamp,
                messageId,
                oldContentLength: oldContent.length
              });
              
              updated.content = contentUpdateFn(oldContent);
              
              console.log('[ChatManager] Content function result:', {
                timestamp: updateTimestamp,
                messageId,
                newContentLength: updated.content.length,
                delta: updated.content.length - oldContent.length,
                newContentEnd: updated.content.substring(updated.content.length - 50)
              });
            } else {
              updated.content = contentUpdateFn;
              console.log('[ChatManager] Content direct assignment:', {
                timestamp: updateTimestamp,
                messageId,
                oldLength: oldContent.length,
                newLength: updated.content.length,
                delta: updated.content.length - oldContent.length
              });
            }
          }
          
          // Handle other updates
          Object.keys(updates).forEach(key => {
            if (key !== 'content') {
              (updated as any)[key] = updates[key];
              console.log('[ChatManager] Updated property:', {
                timestamp: updateTimestamp,
                messageId,
                property: key,
                value: updates[key]
              });
            }
          });
          
          console.log('[ChatManager] Message update complete:', {
            timestamp: updateTimestamp,
            messageId,
            finalContentLength: 'content' in updated ? updated.content?.length : 0
          });
          
          return updated;
        }
        return msg;
      });
      
      console.log('[ChatManager] updateStreamingMessage END:', {
        timestamp: updateTimestamp,
        messageId,
        updatedMessagesCount: updated.length
      });
      
      return updated;
    });
  }, []);

  // Add tool indicator to streaming message
  const addToolIndicator = useCallback((messageId: string, toolCall: StreamingToolCall) => {
    console.log('[ChatManager] addToolIndicator:', {
      timestamp: new Date().toISOString(),
      messageId,
      toolId: toolCall.id,
      toolName: toolCall.name,
      toolStatus: toolCall.status
    });
    
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && isStreamingMessage(msg)) {
        const toolCalls = msg.toolCalls || [];
        console.log('[ChatManager] Adding tool to message:', {
          messageId,
          existingToolCount: toolCalls.length,
          newToolName: toolCall.name
        });
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
    const finalizeTimestamp = new Date().toISOString();
    console.log('[ChatManager] finalizeStreamingMessage:', {
      timestamp: finalizeTimestamp,
      messageId
    });
    
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && isStreamingMessage(msg)) {
        const streamDuration = msg.streamStartTime ? Date.now() - msg.streamStartTime : 0;
        console.log('[ChatManager] Finalizing streaming message:', {
          timestamp: finalizeTimestamp,
          messageId,
          contentLength: msg.content?.length || 0,
          toolCallsCount: msg.toolCalls?.length || 0,
          streamDuration,
          chunksCount: msg.chunks?.length || 0
        });
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