import { useCallback, useRef } from 'react';
import { useDiffPreview } from './useDiffPreview';
import { useChatManager } from './useChatManager';
import { SignalRToolRequest, SignalRAIResponse } from '../types/signalr';
import { AISuggestedOperation } from '../types/diff';
import { useDiffSessionStore } from '../store/useDiffSessionStore';
import { AuditLogger } from '../utils/safetyChecks';

const WRITE_TOOLS = new Set(['write_range', 'apply_formula', 'clear_range', 'smart_format_cells', 'format_range']);

export const useMessageHandlers = (
  chatManager: ReturnType<typeof useChatManager>,
  diffPreview: ReturnType<typeof useDiffPreview>,
  autonomyMode: string,
  addDebugLog: (message: string, type?: 'info' | 'error' | 'warning' | 'success') => void
) => {
  const signalRClientRef = useRef<any>(null);
  const isLivePreviewActiveRef = useRef(false);
  const currentMessageIdRef = useRef<string | null>(null);
  const { addLog } = useDiffSessionStore((state) => state.actions);

  const handleToolRequest = useCallback(async (toolRequest: SignalRToolRequest) => {
    addDebugLog(`← Received tool_request: ${toolRequest.tool} (${toolRequest.request_id})`);
    addLog('info', `[Message Handler] Received tool request ${toolRequest.request_id} (${toolRequest.tool})`, { parameters: toolRequest.parameters });
    
    if (WRITE_TOOLS.has(toolRequest.tool)) {
      addDebugLog(`Tool ${toolRequest.tool} is a write operation. Queueing for preview.`);
      addLog('info', `[Message Handler] Tool ${toolRequest.tool} is a write operation. Queueing for preview.`);
      
      AuditLogger.logToolExecution({
        timestamp: new Date(),
        toolName: toolRequest.tool,
        parameters: toolRequest.parameters,
        autonomyMode: autonomyMode,
        result: 'success',
        sessionId: signalRClientRef.current?.sessionId || 'unknown'
      });
      
      const operation: AISuggestedOperation = { 
        tool: toolRequest.tool, 
        input: toolRequest.parameters,
        description: `Execute ${toolRequest.tool}`
      };
      
      if (!isLivePreviewActiveRef.current) {
        addDebugLog('Starting new preview session');
        addLog('info', `[Message Handler] Starting new preview session for message ${currentMessageIdRef.current || 'unknown'}`);
        isLivePreviewActiveRef.current = true;
        await diffPreview.startPreviewSession(operation, currentMessageIdRef.current || 'unknown');
      } else {
        addDebugLog('Updating existing preview session');
        addLog('info', `[Message Handler] Updating existing preview session with new operation`);
        await diffPreview.updatePreview(operation, currentMessageIdRef.current || 'unknown');
      }
      
      await signalRClientRef.current?.send({
        type: 'tool_response',
        data: {
          request_id: toolRequest.request_id,
          result: { status: 'queued_for_preview', message: 'Tool queued for visual diff preview' },
          error: null,
          queued: true
        }
      });
    } else {
      addDebugLog(`Tool ${toolRequest.tool} is read-only. Executing immediately.`);
      
      AuditLogger.logToolExecution({
        timestamp: new Date(),
        toolName: toolRequest.tool,
        parameters: toolRequest.parameters,
        autonomyMode: autonomyMode,
        result: 'success',
        sessionId: signalRClientRef.current?.sessionId || 'unknown'
      });
      
      await signalRClientRef.current?.send({
        type: 'tool_response',
        data: {
          request_id: toolRequest.request_id,
          result: { status: 'executed', message: 'Read-only tool executed' },
          error: null,
          queued: false
        }
      });
    }
  }, [addDebugLog, addLog, autonomyMode, diffPreview]);

  const handleAIResponse = useCallback((response: SignalRAIResponse) => {
    addDebugLog(`AI response received: ${response.content.substring(0, 50)}...`);
    
    if (response.isComplete) {
      addDebugLog('AI response complete', 'success');
      isLivePreviewActiveRef.current = false;
      chatManager.setAiIsGenerating(false);
    }
    
    const existingMessage = chatManager.messages.find(m => m.id === response.messageId);
    if (existingMessage) {
      chatManager.updateMessage(response.messageId, { content: response.content });
    } else {
      chatManager.addMessage({
        id: response.messageId,
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        type: 'assistant'
      });
    }
  }, [addDebugLog, chatManager]);

  const handleSignalRMessage = useCallback((message: any) => {
    addDebugLog(`SignalR message received: ${message.type}`);
    
    switch (message.type) {
      case 'tool_request':
        handleToolRequest(message.data);
        break;
      case 'ai_response':
        handleAIResponse(message.data);
        break;
      case 'error':
        addDebugLog(`Error from backend: ${message.error}`, 'error');
        chatManager.addMessage({
          role: 'system',
          content: `Error: ${message.error}`,
          timestamp: new Date(),
          type: 'system'
        });
        break;
      default:
        addDebugLog(`Unknown message type: ${message.type}`, 'warning');
    }
  }, [addDebugLog, chatManager, handleToolRequest, handleAIResponse]);

  const handleUserMessageSent = useCallback(async (messageId: string) => {
    currentMessageIdRef.current = messageId;
    addDebugLog(`User message sent: ${messageId}`);
    chatManager.setAiIsGenerating(true);
  }, [addDebugLog, chatManager]);

  const setSignalRClient = (client: any) => {
    signalRClientRef.current = client;
  };

  return {
    handleSignalRMessage,
    handleUserMessageSent,
    setSignalRClient
  };
}; 