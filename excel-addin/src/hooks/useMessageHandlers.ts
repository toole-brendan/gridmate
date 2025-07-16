import { useCallback, useRef } from 'react';
import { useDiffPreview } from './useDiffPreview';
import { useChatManager } from './useChatManager';
import { SignalRToolRequest, SignalRAIResponse } from '../types/signalr';
import { AISuggestedOperation } from '../types/diff';
import { useDiffSessionStore } from '../store/useDiffSessionStore';
import { AuditLogger } from '../utils/safetyChecks';
import { ExcelService } from '../services/excel/ExcelService';

const WRITE_TOOLS = new Set(['write_range', 'apply_formula', 'clear_range', 'smart_format_cells', 'format_range']);

export const useMessageHandlers = (
  chatManager: ReturnType<typeof useChatManager>,
  diffPreview: ReturnType<typeof useDiffPreview>,
  autonomyMode: string,
  addDebugLog: (message: string, type?: 'info' | 'error' | 'warning' | 'success') => void
) => {
  const signalRClientRef = useRef<any>(null);
  const currentMessageIdRef = useRef<string | null>(null);
  const readRequestQueue = useRef<SignalRToolRequest[]>([]);
  const batchTimeout = useRef<NodeJS.Timeout | null>(null);
  const { addLog } = useDiffSessionStore((state) => state.actions);

  const processReadBatch = useCallback(async () => {
    const requests = readRequestQueue.current;
    readRequestQueue.current = [];
    batchTimeout.current = null;
    
    if (requests.length === 0) return;
    
    addDebugLog(`Processing batch of ${requests.length} read requests`);
    addLog('info', `[Message Handler] Processing batch of ${requests.length} read requests`);
    
    try {
      // Execute all read requests in a single batch
      const results = await ExcelService.getInstance().batchReadRange(
        requests.map(req => ({
          requestId: req.request_id,
          range: req.range || req.parameters?.range || ''
        }))
      );
      
      // Send responses back for each request
      for (const request of requests) {
        const result = results.get(request.request_id);
        
        await signalRClientRef.current?.send({
          type: 'tool_response',
          data: {
            request_id: request.request_id,
            result: result || null,
            error: result ? null : 'Failed to read range',
            queued: false
          }
        });
      }
      
      addDebugLog(`Batch processing complete for ${requests.length} requests`, 'success');
    } catch (error) {
      addDebugLog(`Batch processing failed: ${error}`, 'error');
      addLog('error', `[Message Handler] Batch processing failed`, { error });
      
      // Send error responses for all requests
      for (const request of requests) {
        await signalRClientRef.current?.send({
          type: 'tool_response',
          data: {
            request_id: request.request_id,
            result: null,
            error: error instanceof Error ? error.message : 'Batch processing failed',
            queued: false
          }
        });
      }
    }
  }, [addDebugLog, addLog]);

  const handleToolRequest = useCallback(async (toolRequest: SignalRToolRequest) => {
    addDebugLog(`← Received tool_request: ${toolRequest.tool} (${toolRequest.request_id})`);
    addLog('info', `[Message Handler] Received tool request ${toolRequest.request_id} (${toolRequest.tool})`, { parameters: toolRequest });
    
    if (WRITE_TOOLS.has(toolRequest.tool)) {
      // Defensive check for write tools - ensure toolRequest has required fields
      if (!toolRequest || typeof toolRequest !== 'object' || !toolRequest.tool) {
        const errorMsg = `Write tool received with invalid structure`;
        addDebugLog(errorMsg, 'error');
        addLog('error', `[Message Handler] ${errorMsg}`, { 
          toolRequest,
          toolRequestType: typeof toolRequest 
        });
        
        // Send error response back to backend
        await signalRClientRef.current?.send({
          type: 'tool_response',
          data: {
            request_id: toolRequest.request_id,
            result: null,
            error: `Invalid tool request structure`,  // Send as simple string
            queued: false
          }
        });
        
        // Return early to prevent crash
        return;
      }
      
      addDebugLog(`Tool ${toolRequest.tool} is a write operation. Queueing for preview.`);
      addLog('info', `[Message Handler] Tool ${toolRequest.tool} is a write operation. Queueing for preview.`);
      
      AuditLogger.logToolExecution({
        timestamp: new Date(),
        toolName: toolRequest.tool,
        parameters: toolRequest,  // Pass entire toolRequest as backend sends params directly
        autonomyMode: autonomyMode,
        result: 'success',
        sessionId: signalRClientRef.current?.sessionId || 'unknown'
      });
      
      // Get the live snapshot directly from the store to check session status
      const { liveSnapshot } = useDiffSessionStore.getState();

      const operation: AISuggestedOperation = { 
        tool: toolRequest.tool, 
        input: toolRequest,  // Pass entire toolRequest as backend sends params directly in data
        description: `Execute ${toolRequest.tool}`
      };
      
      if (!liveSnapshot) {
        addDebugLog('No active session found. Starting new preview session.');
        addLog('info', `[Message Handler] Starting new preview session for message ${currentMessageIdRef.current || 'unknown'}`);
        // IMPORTANT: Do NOT await this call. Let it run in the background.
        // Awaiting it creates the race condition. The UI will update reactively.
        diffPreview.startPreviewSession(operation, currentMessageIdRef.current || 'unknown');
      } else {
        addDebugLog('Active session found. Updating existing preview session.');
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
    } else if (toolRequest.tool === 'read_range') {
      // Batch read_range requests for performance
      addDebugLog(`Tool ${toolRequest.tool} is read-only. Adding to batch queue.`);
      addLog('info', `[Message Handler] Adding read_range request to batch queue`);
      
      // Add to queue
      readRequestQueue.current.push(toolRequest);
      
      // Clear existing timeout and set new one
      if (batchTimeout.current) {
        clearTimeout(batchTimeout.current);
      }
      
      // Process batch after 50ms of no new requests
      batchTimeout.current = setTimeout(() => {
        processReadBatch();
      }, 50);
      
    } else {
      addDebugLog(`Tool ${toolRequest.tool} is read-only. Executing immediately.`);

      try {
        // Execute using ExcelService for all tools (unified approach)
        // Pass entire toolRequest as backend sends params directly in data object
        const result = await ExcelService.getInstance().executeToolRequest(toolRequest.tool, toolRequest);

        // Log successful execution
        AuditLogger.logToolExecution({
          timestamp: new Date(),
          toolName: toolRequest.tool,
          parameters: toolRequest,  // Pass entire toolRequest as backend sends params directly
          autonomyMode: autonomyMode,
          result: 'success',
          sessionId: signalRClientRef.current?.sessionId || 'unknown'
        });

        // Send the actual result back to the backend
        await signalRClientRef.current?.send({
          type: 'tool_response',
          data: {
            request_id: toolRequest.request_id,
            result: result,
            error: null,
            queued: false
          }
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during tool execution.';
        
        // Log failed execution
        AuditLogger.logToolExecution({
          timestamp: new Date(),
          toolName: toolRequest.tool,
          parameters: toolRequest,  // Pass entire toolRequest as backend sends params directly
          autonomyMode: autonomyMode,
          result: 'failure',
          error: errorMessage,
          sessionId: signalRClientRef.current?.sessionId || 'unknown'
        });

        // Send an error response back to the backend
        // Use simple string for error to match backend expectations
        await signalRClientRef.current?.send({
          type: 'tool_response',
          data: {
            request_id: toolRequest.request_id,
            result: null,
            error: errorMessage,  // Send as simple string instead of object
            queued: false
          }
        });
      }
    }
  }, [addDebugLog, addLog, autonomyMode, diffPreview, processReadBatch]);

  const handleAIResponse = useCallback((response: SignalRAIResponse) => {
    addDebugLog(`AI response received: ${response.content.substring(0, 50)}...`);
    
    if (response.isComplete) {
      addDebugLog('AI response complete', 'success');
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
    // Enhanced diagnostic logging - log the entire raw message
    addDebugLog(`SignalR raw message: ${JSON.stringify(message)}`);
    addLog('info', '[Message Handler] Received raw SignalR message', { rawMessage: message });
    
    switch (message.type) {
      case 'tool_request':
        handleToolRequest(message.data);
        break;
      case 'ai_response':
        handleAIResponse(message.data);
        break;
      case 'error':
        addDebugLog(`Error from backend: ${message.data?.message || 'Unknown error'}`, 'error');
        chatManager.addMessage({
          role: 'system',
          content: `Error: ${message.data?.message || 'An unknown error occurred.'}`,
          timestamp: new Date(),
          type: 'system'
        });
        break;
      case 'notification':
        addDebugLog(`Backend notification: ${message.data?.message}`, 'info');
        break;
      case 'auth_success':
        addDebugLog(`Authentication successful. Session ID: ${message.data?.sessionId}`, 'success');
        if (signalRClientRef.current) {
          signalRClientRef.current.sessionId = message.data?.sessionId;
        }
        break;
      case 'connected':
        addDebugLog('Connection established. Authenticating...', 'info');
        // Authentication is handled by the SignalRClient now
        break;
      default:
        addDebugLog(`Unknown message type: ${message.type}`, 'warning');
    }
  }, [addDebugLog, addLog, chatManager, handleToolRequest, handleAIResponse]);

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