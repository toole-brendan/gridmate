import { useCallback, useRef, useState, useEffect } from 'react';
import { useDiffPreview } from './useDiffPreview';
import { useChatManager } from './useChatManager';
import { SignalRToolRequest, SignalRAIResponse } from '../types/signalr';
import { AISuggestedOperation } from '../types/diff';
import { AuditLogger } from '../utils/safetyChecks';
import { ExcelService } from '../services/excel/ExcelService';
import { BatchExecutor } from '../services/excel/batchExecutor';
import { WriteOperationQueue } from '../services/excel/WriteOperationQueue';

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
  const [messageTimeouts, setMessageTimeouts] = useState<Map<string, NodeJS.Timeout>>(new Map());
  const addLog = (type: string, message: string, data?: any) => {
    console.log(`[${type}] ${message}`, data);
  };

  // Helper function to send final tool response
  const sendFinalToolResponse = useCallback(async (
    requestId: string, 
    result: any, 
    error: string | null
  ) => {
    const responseData = {
      sessionId: signalRClientRef.current?.sessionId || '',
      requestId: requestId,
      result: result,
      error: error || '',
      errorDetails: error || '',
      metadata: {},
      timestamp: new Date().toISOString(),
      queued: false,
      acknowledged: false
    };
    
    console.log('[Message Handler] Sending final tool response:', responseData);
    
    await signalRClientRef.current?.send({
      type: 'tool_response',
      data: responseData
    });
  }, []);

  // Initialize WriteOperationQueue with callbacks
  useEffect(() => {
    const queue = WriteOperationQueue.getInstance();
    queue.setCallbacks({
      onPreviewReady: async (messageId, operations) => {
        // Use batched preview generation for better performance
        diffPreview.generateBatchedPreview(messageId, operations);
        
        // Send queued_for_preview response for all operations
        for (const op of operations) {
          await sendFinalToolResponse(
            op.input.request_id,
            { status: 'queued_for_preview', message: 'Tool queued for visual diff preview' },
            null
          );
        }
      },
      onBatchComplete: async (requestId, result, error) => {
        // Send final response for batch-executed operations
        await sendFinalToolResponse(requestId, result, error);
      }
    });
  }, [diffPreview, sendFinalToolResponse]);

  // Helper function to send immediate acknowledgment
  const sendAcknowledgment = useCallback(async (requestId: string, tool: string) => {
    await signalRClientRef.current?.send({
      type: 'tool_response',
      data: {
        sessionId: signalRClientRef.current?.sessionId || '',
        requestId: requestId,
        result: { 
          status: 'acknowledged', 
          message: `${tool} request received and processing` 
        },
        error: '',
        errorDetails: '',
        metadata: {},
        timestamp: new Date().toISOString(),
        queued: true,
        acknowledged: true
      }
    });
  }, []);

  // Queue write operation for preview
  const queueForPreview = useCallback(async (toolRequest: SignalRToolRequest) => {
    WriteOperationQueue.getInstance().queueForPreview(
      currentMessageIdRef.current || 'unknown',
      toolRequest
    );
  }, []);

  // Queue for batch execution without preview
  const queueForBatchExecution = useCallback(async (toolRequest: SignalRToolRequest) => {
    WriteOperationQueue.getInstance().queueForExecution(toolRequest);
  }, []);

  const processReadBatch = useCallback(async () => {
    const requests = readRequestQueue.current;
    readRequestQueue.current = [];
    batchTimeout.current = null;
    
    if (requests.length === 0) return;
    
    addDebugLog(`Processing batch of ${requests.length} read requests`);
    addLog('info', `[Message Handler] Processing batch of ${requests.length} read requests`);
    
    try {
      // Execute all read requests in a single batch
      const batchRequests = requests.map(req => {
        const range = req.range || req.parameters?.range || '';
        addLog('info', `[Message Handler] Batch request: ${req.request_id} for range: ${range}`);
        return {
          requestId: req.request_id,
          range: range
        };
      });
      
      const results = await ExcelService.getInstance().batchReadRange(batchRequests);
      
      // Send responses back for each request
      for (const request of requests) {
        const result = results.get(request.request_id);
        
        // Log the size of data being sent
        if (result) {
          const dataSize = JSON.stringify(result).length;
          addDebugLog(`Sending tool_response for ${request.request_id} - Data size: ${dataSize} bytes`);
          addLog('info', `[Message Handler] Tool response data size: ${dataSize} bytes`, {
            rowCount: result.rowCount,
            colCount: result.colCount,
            cellCount: result.rowCount * result.colCount
          });
        }
        
        await sendFinalToolResponse(
          request.request_id,
          result || null,
          result ? null : 'Failed to read range'
        );
      }
      
      addDebugLog(`Batch processing complete for ${requests.length} requests`, 'success');
    } catch (error) {
      addDebugLog(`Batch processing failed: ${error}`, 'error');
      addLog('error', `[Message Handler] Batch processing failed`, { error });
      
      // Send error responses for all requests
      for (const request of requests) {
        await sendFinalToolResponse(
          request.request_id,
          null,
          error instanceof Error ? error.message : 'Batch processing failed'
        );
      }
    }
  }, [addDebugLog, addLog, sendFinalToolResponse]);

  const handleToolRequest = useCallback(async (toolRequest: SignalRToolRequest) => {
    addDebugLog(`← Received tool_request: ${toolRequest.tool} (${toolRequest.request_id})`);
    addLog('info', `[Message Handler] Received tool request ${toolRequest.request_id} (${toolRequest.tool})`, { parameters: toolRequest });
    
    // Send immediate acknowledgment to prevent backend timeout
    await sendAcknowledgment(toolRequest.request_id, toolRequest.tool);
    
    // Defensive check for write tools - ensure toolRequest has required fields
    if (!toolRequest || typeof toolRequest !== 'object' || !toolRequest.tool) {
      const errorMsg = `Invalid tool request structure`;
      addDebugLog(errorMsg, 'error');
      await sendFinalToolResponse(toolRequest.request_id, null, errorMsg);
      return;
    }
    
    // Process the tool based on type
    if (WRITE_TOOLS.has(toolRequest.tool)) {
      // Check if preview is requested
      const shouldPreview = toolRequest.preview !== false && autonomyMode !== 'full-autonomy';
      
      // Log tool execution
      AuditLogger.logToolExecution({
        timestamp: new Date(),
        toolName: toolRequest.tool,
        parameters: toolRequest,
        autonomyMode: autonomyMode,
        result: 'success',
        sessionId: signalRClientRef.current?.sessionId || 'unknown'
      });
      
      if (shouldPreview) {
        // Queue for preview
        addDebugLog(`Tool ${toolRequest.tool} queued for preview generation`);
        await queueForPreview(toolRequest);
      } else {
        // Queue for batch execution without preview
        addDebugLog(`Tool ${toolRequest.tool} queued for direct batch execution`);
        await queueForBatchExecution(toolRequest);
      }
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
      // Execute immediately for other tools
      addDebugLog(`Tool ${toolRequest.tool} is read-only. Executing immediately.`);

      try {
        // Execute using ExcelService for all tools (unified approach)
        const result = await ExcelService.getInstance().executeToolRequest(toolRequest.tool, toolRequest);

        // Log successful execution
        AuditLogger.logToolExecution({
          timestamp: new Date(),
          toolName: toolRequest.tool,
          parameters: toolRequest,
          autonomyMode: autonomyMode,
          result: 'success',
          sessionId: signalRClientRef.current?.sessionId || 'unknown'
        });

        // Send the final result back to the backend
        await sendFinalToolResponse(toolRequest.request_id, result, null);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during tool execution.';
        
        // Log failed execution
        AuditLogger.logToolExecution({
          timestamp: new Date(),
          toolName: toolRequest.tool,
          parameters: toolRequest,
          autonomyMode: autonomyMode,
          result: 'failure',
          error: errorMessage,
          sessionId: signalRClientRef.current?.sessionId || 'unknown'
        });

        // Send error response
        await sendFinalToolResponse(toolRequest.request_id, null, errorMessage);
      }
    }
  }, [addDebugLog, addLog, autonomyMode, sendAcknowledgment, sendFinalToolResponse, queueForPreview, queueForBatchExecution, processReadBatch]);

  const handleAIResponse = useCallback((response: SignalRAIResponse) => {
    addDebugLog(`AI response received: ${response.content.substring(0, 50)}...`);
    
    // Check if the response is complete
    if (response.isComplete) {
      addDebugLog('AI response complete', 'success');
      chatManager.setAiIsGenerating(false);
      chatManager.setIsLoading(false);
      
      // Clear timeout for this message
      const timeout = messageTimeouts.get(response.messageId);
      if (timeout) {
        clearTimeout(timeout);
        setMessageTimeouts(prev => {
          const newMap = new Map(prev);
          newMap.delete(response.messageId);
          return newMap;
        });
      }
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
  }, [addDebugLog, chatManager, messageTimeouts]);

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
        chatManager.setIsLoading(false);
        chatManager.setAiIsGenerating(false);
        chatManager.addMessage({
          role: 'system',
          content: `Error: ${message.data?.message || 'An unknown error occurred.'}`,
          timestamp: new Date(),
          type: 'system'
        });
        break;
      case 'notification':
        // Handle initial connection notification gracefully
        if (message.data?.connectionId) {
          addDebugLog(`Backend connected. Connection ID: ${message.data.connectionId}`, 'info');
        } else if (message.data?.message) {
          addDebugLog(`Backend notification: ${message.data.message}`, 'info');
        } else {
          addDebugLog(`Backend notification received`, 'info');
        }
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
    
    // Set timeout for stuck requests (60 seconds)
    const timeout = setTimeout(() => {
      addDebugLog(`Message ${messageId} timed out`, 'warning');
      chatManager.setIsLoading(false);
      chatManager.setAiIsGenerating(false);
      chatManager.addMessage({
        id: `timeout_${messageId}`,
        role: 'system',
        content: '⏱️ Request timed out. Please try again.',
        timestamp: new Date(),
        type: 'error',
      });
    }, 60000);
    
    setMessageTimeouts(prev => new Map(prev).set(messageId, timeout));
  }, [addDebugLog, chatManager]);

  const setSignalRClient = (client: any) => {
    signalRClientRef.current = client;
  };

  return {
    handleSignalRMessage,
    handleUserMessageSent,
    setSignalRClient,
    sendFinalToolResponse
  };
}; 