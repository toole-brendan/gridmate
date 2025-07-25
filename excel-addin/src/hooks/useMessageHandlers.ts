import { useCallback, useRef, useEffect, useState } from 'react';
import { StreamChunk, StreamingMessage, StreamingSession } from '../types/streaming';
import { ExcelService } from '../services/excel/ExcelService';
import { useDiffPreview } from './useDiffPreview';
import { useChatManager } from './useChatManager';
import { SignalRToolRequest, SignalRAIResponse } from '../types/signalr';
import { DiffPreviewMessage } from '../types/enhanced-chat';
import { AuditLogger } from '../utils/safetyChecks';
import { clearAppliedOperations } from '../utils/diffSimulator';

const WRITE_TOOLS = new Set(['write_range', 'apply_formula', 'clear_range', 'smart_format_cells', 'format_range']);

export const useMessageHandlers = (
  chatManager: ReturnType<typeof useChatManager>,
  diffPreview: ReturnType<typeof useDiffPreview>,
  autonomyMode: string,
  addDebugLog: (message: string, type?: 'info' | 'error' | 'warning' | 'success') => void,
  onTokenUsage?: (usage: import('../types/signalr').TokenUsage) => void
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
    error: string | null,
    isStreamingMode: boolean = false
  ) => {
    const responseData = {
      sessionId: signalRClientRef.current?.sessionId || '',
      requestId: requestId,
      result: result,
      error: error || '',
      errorDetails: error || '',
      metadata: {
        streaming_mode: isStreamingMode
      },
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

  // Store pending preview operations
  const pendingPreviewRef = useRef<Map<string, SignalRToolRequest>>(new Map());
  
  // Operation queue for sequential processing
  const operationQueueRef = useRef<SignalRToolRequest[]>([]);
  const isProcessingQueueRef = useRef<boolean>(false);
  const currentOperationIndexRef = useRef<number>(0);
  const totalOperationsRef = useRef<number>(0);
  
  // Track processed requests to prevent duplicates
  const processedRequestsRef = useRef<Set<string>>(new Set());

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

  // Forward declare these functions - they'll be defined later
  const handlePreviewAcceptRef = useRef<(requestId: string) => Promise<void>>();
  const handlePreviewRejectRef = useRef<(requestId: string) => Promise<void>>();
  
  // Forward declare processNextOperation - it will be defined after showOperationPreview
  const processNextOperationRef = useRef<() => Promise<void>>();
  
  // Helper to ensure processNextOperation is called safely
  const startProcessingQueue = useCallback(() => {
    if (processNextOperationRef.current) {
      addDebugLog('Starting queue processing via startProcessingQueue');
      processNextOperationRef.current();
    } else {
      // Fallback: try again after a short delay if ref not yet assigned
      addDebugLog('processNextOperationRef not yet assigned, retrying in 50ms', 'warning');
      setTimeout(() => {
        if (processNextOperationRef.current) {
          addDebugLog('Retry successful - starting queue processing');
          processNextOperationRef.current();
        } else {
          addDebugLog('processNextOperationRef still not assigned after retry!', 'error');
        }
      }, 50);
    }
  }, [addDebugLog]);

  // Handle individual operation preview
  const showOperationPreview = useCallback(async (toolRequest: SignalRToolRequest) => {
    addDebugLog(`showOperationPreview called for ${toolRequest.tool} (${toolRequest.request_id})`);
    
    // Store the pending operation
    pendingPreviewRef.current.set(toolRequest.request_id, toolRequest);
    
    // Create an operation for the diff preview
    const operation = {
      tool: toolRequest.tool,
      input: toolRequest,
      description: `Execute ${toolRequest.tool}`
    };
    
    // Generate visual diff preview in Excel
    // Note: We'll pass the preview message ID to avoid attaching diff data to the AI message
    const previewMessageId = `preview_${toolRequest.request_id}`;
    
    try {
      addDebugLog(`Generating visual preview for ${previewMessageId}`);
      await diffPreview.generatePreview(previewMessageId, [operation]);
      addDebugLog(`Visual preview generated successfully`);
    } catch (error) {
      addDebugLog(`Failed to generate visual preview: ${error}`, 'error');
    }
    
    // Add a preview message to the chat with operation counter
    const previewMessage: DiffPreviewMessage = {
      id: `preview_${toolRequest.request_id}`,
      type: 'diff-preview',
      content: '',
      timestamp: new Date(),
      requestId: toolRequest.request_id,
      operation: operation,
      status: 'pending',
      operationIndex: currentOperationIndexRef.current + 1,
      totalOperations: totalOperationsRef.current,
      actions: {
        accept: () => handlePreviewAcceptRef.current?.(toolRequest.request_id),
        reject: () => handlePreviewRejectRef.current?.(toolRequest.request_id)
      }
    };
    
    addDebugLog(`Adding preview message to chat: ${previewMessage.id}`);
    chatManager.addMessage(previewMessage);
    addDebugLog(`Preview message added successfully`);
  }, [chatManager, diffPreview, addDebugLog]);
  
  // Process the next operation in the queue
  const processNextOperation = useCallback(async () => {
    addDebugLog(`processNextOperation called. Queue length: ${operationQueueRef.current.length}, isProcessing: ${isProcessingQueueRef.current}`);
    
    // Check if queue is empty
    if (operationQueueRef.current.length === 0) {
      if (isProcessingQueueRef.current) {
        addDebugLog('All operations processed', 'success');
        // Reset all counters and clear processed requests
        currentOperationIndexRef.current = 0;
        totalOperationsRef.current = 0;
        processedRequestsRef.current.clear();
        pendingPreviewRef.current.clear();
        isProcessingQueueRef.current = false;
        
        // Clear the chat loading states since all operations are complete
        chatManager.setAiIsGenerating(false);
        chatManager.setIsLoading(false);
        
        // Force update the current AI message to show as complete
        if (currentMessageIdRef.current) {
          const aiMessage = chatManager.messages.find(
            m => m.id === currentMessageIdRef.current && m.role === 'assistant'
          );
          if (aiMessage) {
            chatManager.updateMessage(currentMessageIdRef.current, {
              isComplete: true
            });
          }
        }
      }
      return;
    }
    
    // If already processing, don't start another
    if (isProcessingQueueRef.current) {
      return;
    }
    
    isProcessingQueueRef.current = true;
    const nextOperation = operationQueueRef.current[0];
    
    addDebugLog(`Processing operation ${currentOperationIndexRef.current + 1} of ${totalOperationsRef.current}`);
    
    // Show the preview for this operation
    await showOperationPreview(nextOperation);
  }, [addDebugLog, showOperationPreview, chatManager]);
  
  // Assign to ref immediately using useEffect to ensure it's available
  useEffect(() => {
    processNextOperationRef.current = processNextOperation;
  }, [processNextOperation]);

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
          result ? null : 'Failed to read range',
          false // Batch reads are not in streaming mode
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
          error instanceof Error ? error.message : 'Batch processing failed',
          false // Batch reads are not in streaming mode
        );
      }
    }
  }, [addDebugLog, addLog, sendFinalToolResponse]);

  const handleToolRequest = useCallback(async (toolRequest: SignalRToolRequest) => {
    addDebugLog(`← Received tool_request: ${toolRequest.tool} (${toolRequest.request_id})`);
    addLog('info', `[Message Handler] Received tool request ${toolRequest.request_id} (${toolRequest.tool})`, { parameters: toolRequest });
    
    // Debug log the full request to see if preview field is present
    console.log('[DEBUG] Full tool request received:', JSON.stringify(toolRequest, null, 2));
    console.log('[DEBUG] Preview field:', toolRequest.preview);
    console.log('[DEBUG] Current autonomy mode:', autonomyMode);
    console.log('[DEBUG] Tool request parameters:', toolRequest.parameters);
    
    // Check if we're in streaming mode by checking if there's an active streaming message
    const isStreamingMode = chatManager.messages.some(msg => 
      'isStreaming' in msg && msg.isStreaming === true
    );
    
    // Auto-accept any existing preview before showing new one (only in non-streaming mode)
    if (!isStreamingMode && pendingPreviewRef.current.size > 0) {
      addDebugLog(`Auto-accepting ${pendingPreviewRef.current.size} pending previews before new tool request`, 'info');
      
      // Get the first pending preview (should only be one)
      const [requestId] = Array.from(pendingPreviewRef.current.keys());
      
      // Auto-accept it
      if (handlePreviewAcceptRef.current) {
        await handlePreviewAcceptRef.current(requestId);
      }
    }
    
    // Send immediate acknowledgment to prevent backend timeout
    await sendAcknowledgment(toolRequest.request_id, toolRequest.tool);
    
    // Defensive check for write tools - ensure toolRequest has required fields
    if (!toolRequest || typeof toolRequest !== 'object' || !toolRequest.tool) {
      const errorMsg = `Invalid tool request structure`;
      addDebugLog(errorMsg, 'error');
      await sendFinalToolResponse(toolRequest.request_id, null, errorMsg, isStreamingMode);
      return;
    }
    
    // Process the tool based on type
    if (WRITE_TOOLS.has(toolRequest.tool)) {
      // Determine if we should preview based on autonomy mode and tool type
      let shouldPreview = false;
      
      if (autonomyMode === 'read-only') {
        // In read-only mode, reject all write operations
        const errorMsg = `Write operation ${toolRequest.tool} not allowed in read-only mode`;
        addDebugLog(errorMsg, 'warning');
        await sendFinalToolResponse(toolRequest.request_id, null, errorMsg, isStreamingMode);
        return;
      } else if (autonomyMode === 'full-autonomy' || autonomyMode === 'yolo') {
        // In full-autonomy/yolo mode, execute immediately
        shouldPreview = false;
      } else if (autonomyMode === 'agent-default' || autonomyMode === 'default') {
        // In default mode, show preview for write operations (even in streaming)
        shouldPreview = true;
      } else {
        // For any other mode, check the preview flag
        shouldPreview = toolRequest.preview !== false;
      }
      
      // Debug logging for preview mode
      addDebugLog(`Tool ${toolRequest.tool} - streaming: ${isStreamingMode}, autonomyMode: ${autonomyMode}, shouldPreview: ${shouldPreview}`);
      
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
        // Add to queue for preview (even in streaming mode for default autonomy)
        addDebugLog(`Tool ${toolRequest.tool} adding to preview queue`);
        operationQueueRef.current.push(toolRequest);
        
        // Update total operations count if we have more than before
        if (operationQueueRef.current.length > totalOperationsRef.current) {
          totalOperationsRef.current = operationQueueRef.current.length;
        }
        
        // If this is the first operation or we're not currently processing
        if (!isProcessingQueueRef.current) {
          // Wait a bit to collect all operations in the batch
          setTimeout(() => {
            if (!isProcessingQueueRef.current && operationQueueRef.current.length > 0) {
              totalOperationsRef.current = operationQueueRef.current.length;
              addDebugLog(`Queued ${totalOperationsRef.current} operations for preview`);
              // Start processing the queue
              startProcessingQueue();
            }
          }, 200);
        }
        
        // In streaming mode, send a response indicating the tool is queued
        if (isStreamingMode) {
          await sendFinalToolResponse(
            toolRequest.request_id, 
            { status: 'queued_for_preview', message: 'Operation queued for user approval' }, 
            null, 
            isStreamingMode
          );
        }
      } else {
        // Execute immediately without preview (full-autonomy mode)
        addDebugLog(`Tool ${toolRequest.tool} executing immediately (autonomy: ${autonomyMode})`);
        try {
          const result = await ExcelService.getInstance().executeToolRequest(toolRequest.tool, toolRequest);
          
          // Track AI edit and update selection if it's a write operation
          if (WRITE_TOOLS.has(toolRequest.tool) && toolRequest.range) {
            // Track the AI edit
            ExcelService.getInstance().trackAIEdit(toolRequest.range);
            addDebugLog(`Tracked AI edit for range: ${toolRequest.range}`, 'info');
            
            // Optionally select the edited range to update context
            try {
              await ExcelService.getInstance().selectRange(toolRequest.range);
              addDebugLog(`Selected AI-edited range: ${toolRequest.range}`, 'success');
            } catch (err) {
              console.error("Failed to select AI-edited range:", err);
              // Don't fail the operation if selection fails
            }
          }
          
          await sendFinalToolResponse(toolRequest.request_id, result, null, isStreamingMode);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Operation failed';
          await sendFinalToolResponse(toolRequest.request_id, null, errorMessage, isStreamingMode);
        }
      }
    } else if (toolRequest.tool === 'read_range') {
      // In streaming mode, execute read operations immediately
      if (isStreamingMode) {
        addDebugLog(`Tool ${toolRequest.tool} executing immediately in streaming mode`);
        try {
          const result = await ExcelService.getInstance().executeToolRequest(toolRequest.tool, toolRequest);
          await sendFinalToolResponse(toolRequest.request_id, result, null, isStreamingMode);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Read operation failed';
          await sendFinalToolResponse(toolRequest.request_id, null, errorMessage, isStreamingMode);
        }
      } else {
        // Batch read_range requests for performance in non-streaming mode
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
      }
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
        await sendFinalToolResponse(toolRequest.request_id, result, null, isStreamingMode);

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
        await sendFinalToolResponse(toolRequest.request_id, null, errorMessage, isStreamingMode);
      }
    }
  }, [addDebugLog, addLog, autonomyMode, sendAcknowledgment, sendFinalToolResponse, showOperationPreview, processReadBatch, startProcessingQueue, chatManager]);

  const handleAIResponse = useCallback((response: SignalRAIResponse) => {
    addDebugLog(`AI response received: ${response.content?.substring(0, 50) || ''}...`);
    
    // Handle token usage if present
    if (response.tokenUsage && onTokenUsage) {
      addDebugLog(`Token usage update: ${response.tokenUsage.total}/${response.tokenUsage.max} tokens`, 'info');
      onTokenUsage(response.tokenUsage);
    }
    
    // Check if this is a completion message
    if (response.type === 'completion') {
      addDebugLog('Received completion message from backend', 'success');
      
      // Clear all loading states
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
      
      // Update or add the completion message
      const existingMessage = chatManager.messages.find(m => m.id === response.messageId);
      if (existingMessage) {
        chatManager.updateMessage(response.messageId, { 
          content: response.content,
          isComplete: true 
        });
      } else {
        chatManager.addMessage({
          id: response.messageId,
          role: 'assistant',
          content: response.content,
          timestamp: new Date(),
          type: 'assistant',
          isComplete: true
        });
      }
      
      return; // Early return for completion messages
    }

    // Handle actions in the AI response (including preview_queued)
    if (response.actions && Array.isArray(response.actions)) {
      addDebugLog(`Processing ${response.actions.length} actions from AI response`);
      
      response.actions.forEach((action: any) => {
        if (action.type === 'preview_queued') {
          addDebugLog(`Found preview_queued action: ${JSON.stringify(action)}`);
          
          // Create a preview message for each queued operation
          const previewMessage: DiffPreviewMessage = {
            id: `preview_${action.operation_id || action.id}`,
            type: 'diff-preview',
            content: '',
            timestamp: new Date(),
            requestId: action.operation_id || action.id,
            operation: {
              tool: action.tool_type || action.type,
              input: action.input || {},
              description: action.preview || action.description || `Execute ${action.tool_type || action.type}`
            },
            status: 'pending',
            preview: action.preview, // Include the structured preview
            previewType: action.preview_type,
            actions: {
              accept: () => handlePreviewAcceptRef.current?.(action.operation_id || action.id),
              reject: () => handlePreviewRejectRef.current?.(action.operation_id || action.id)
            }
          };
          
          chatManager.addMessage(previewMessage);
          addDebugLog(`Added preview message for queued operation: ${previewMessage.id}`);
        }
      });
    }
    
    // Check if this is an error response
    const isError = response.error || (response.content && (response.content.includes("error") || response.content.includes("Please try again")));
    
    // Check if the response is complete or is an error
    if (response.isComplete || isError) {
      // If error, mark as complete
      if (isError) {
        addDebugLog(isError ? 'AI response error' : 'AI response complete', isError ? 'error' : 'success');
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
  }, [addDebugLog, chatManager, messageTimeouts, onTokenUsage]);

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
    // Clear any pending operations from previous messages
    if (pendingPreviewRef.current.size > 0) {
      addDebugLog(`Clearing ${pendingPreviewRef.current.size} pending previews from previous message`, 'warning');
      pendingPreviewRef.current.clear();
    }
    
    // Reset all state for new message
    currentMessageIdRef.current = messageId;
    currentOperationIndexRef.current = 0;
    totalOperationsRef.current = 0;
    operationQueueRef.current = [];
    processedRequestsRef.current.clear();
    pendingPreviewRef.current.clear();
    isProcessingQueueRef.current = false;
    
    // Clear any pending read requests
    readRequestQueue.current = [];
    if (batchTimeout.current) {
      clearTimeout(batchTimeout.current);
      batchTimeout.current = null;
    }
    
    // Clear applied operations tracking from diff simulator
    clearAppliedOperations();
    
    addDebugLog(`User message sent: ${messageId} - All state reset`);
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

  // Handle preview accept for individual operation
  const handlePreviewAccept = useCallback(async (requestId: string) => {
    // Check if already processed
    if (processedRequestsRef.current.has(requestId)) {
      addDebugLog(`Request ${requestId} already processed, ignoring`, 'warning');
      return;
    }
    
    const toolRequest = pendingPreviewRef.current.get(requestId);
    if (!toolRequest) {
      addDebugLog(`No pending operation found for requestId: ${requestId}`, 'error');
      return;
    }
    
    // Mark as processed immediately
    processedRequestsRef.current.add(requestId);
    
    // Update message status to processing
    const previewMessageId = `preview_${requestId}`;
    const messages = chatManager.messages;
    const previewMessage = messages.find(m => m.id === previewMessageId);
    if (previewMessage && 'status' in previewMessage) {
      chatManager.updateMessage(previewMessageId, { status: 'accepted' });
    }
    
    try {
      // Clear visual highlights before executing
      await diffPreview.rejectCurrentPreview();
      
      // Execute the operation
      const result = await ExcelService.getInstance().executeToolRequest(toolRequest.tool, toolRequest);
      
      // Track AI edit and update selection if it's a write operation
      if (WRITE_TOOLS.has(toolRequest.tool) && toolRequest.range) {
        // Track the AI edit
        ExcelService.getInstance().trackAIEdit(toolRequest.range);
        addDebugLog(`Tracked AI edit for range: ${toolRequest.range}`, 'info');
        
        // Optionally select the edited range to update context
        try {
          await ExcelService.getInstance().selectRange(toolRequest.range);
          addDebugLog(`Selected AI-edited range: ${toolRequest.range}`, 'success');
        } catch (err) {
          console.error("Failed to select AI-edited range:", err);
          // Don't fail the operation if selection fails
        }
      }
      
      // Send final response to backend
      await sendFinalToolResponse(requestId, result, null, false); // Previews are not in streaming mode
      
      // Remove from pending
      pendingPreviewRef.current.delete(requestId);
      
      // Remove the preview message from chat
      chatManager.removeMessage(`preview_${requestId}`);
      
      // Remove from queue and advance
      operationQueueRef.current.shift();
      currentOperationIndexRef.current++;
      
      addDebugLog(`Preview accepted and executed for ${requestId}`, 'success');
      
      // Process next operation after a short delay
      isProcessingQueueRef.current = false;
      setTimeout(() => {
        startProcessingQueue();
      }, 200);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Operation failed';
      await sendFinalToolResponse(requestId, null, errorMessage, false); // Previews are not in streaming mode
      pendingPreviewRef.current.delete(requestId);
      chatManager.removeMessage(`preview_${requestId}`);
      operationQueueRef.current.shift();
      currentOperationIndexRef.current++;
      isProcessingQueueRef.current = false;
      addDebugLog(`Preview execution failed for ${requestId}: ${errorMessage}`, 'error');
      
      // Continue with next operation even on failure
      setTimeout(() => {
        startProcessingQueue();
      }, 200);
    }
  }, [sendFinalToolResponse, chatManager, addDebugLog, diffPreview, startProcessingQueue]);

  // Handle preview reject for individual operation
  const handlePreviewReject = useCallback(async (requestId: string) => {
    // Check if already processed
    if (processedRequestsRef.current.has(requestId)) {
      addDebugLog(`Request ${requestId} already processed, ignoring`, 'warning');
      return;
    }
    
    const toolRequest = pendingPreviewRef.current.get(requestId);
    if (!toolRequest) {
      addDebugLog(`No pending operation found for requestId: ${requestId}`, 'error');
      return;
    }
    
    // Mark as processed immediately
    processedRequestsRef.current.add(requestId);
    
    // Update message status to processing
    const previewMessageId = `preview_${requestId}`;
    const messages = chatManager.messages;
    const previewMessage = messages.find(m => m.id === previewMessageId);
    if (previewMessage && 'status' in previewMessage) {
      chatManager.updateMessage(previewMessageId, { status: 'rejected' });
    }
    
    // Clear visual highlights
    await diffPreview.rejectCurrentPreview();
    
    // Send rejection response to backend
    await sendFinalToolResponse(requestId, null, 'Operation rejected by user', false); // Previews are not in streaming mode
    
    // Remove from pending
    pendingPreviewRef.current.delete(requestId);
    
    // Remove the preview message from chat
    chatManager.removeMessage(`preview_${requestId}`);
    
    // Remove from queue and advance
    operationQueueRef.current.shift();
    currentOperationIndexRef.current++;
    
    addDebugLog(`Preview rejected for ${requestId}`, 'info');
    
    // Process next operation after a short delay
    isProcessingQueueRef.current = false;
    setTimeout(() => {
      processNextOperationRef.current?.();
    }, 200);
  }, [sendFinalToolResponse, chatManager, addDebugLog, diffPreview, startProcessingQueue]);

  // Streaming support
  const currentStreamRef = useRef<EventSource | null>(null);
  const streamHealthCheckRef = useRef<NodeJS.Timeout | null>(null);
  const handleStreamChunkRef = useRef<(messageId: string, chunk: StreamChunk) => void>();

  // Add a ref to track streaming updates
  const streamingUpdatesRef = useRef<Map<string, { count: number; content: string; lastUpdate: number }>>(new Map());
  
  // Add streaming message handler
  const sendStreamingMessage = useCallback(async (content: string, autonomyMode: string) => {
    console.log('[sendStreamingMessage] Called with:', {
      contentLength: content.length,
      contentPreview: content.substring(0, 100),
      autonomyMode,
      hasSignalRClient: !!signalRClientRef.current,
      timestamp: new Date().toISOString()
    });
    
    if (!signalRClientRef.current) {
      addDebugLog('Cannot send message: SignalR not connected', 'error');
      return;
    }
    
    // Cancel any existing stream
    if (currentStreamRef.current) {
      console.log('[sendStreamingMessage] Cancelling existing stream');
      signalRClientRef.current.cancelStream(currentStreamRef.current);
      currentStreamRef.current = null;
    }
    
    // Create streaming message ID
    const streamingMessageId = `stream_${Date.now()}`;
    currentMessageIdRef.current = streamingMessageId;
    
    console.log('[sendStreamingMessage] Creating streaming message:', {
      messageId: streamingMessageId,
      timestamp: new Date().toISOString()
    });
    
    // Add initial streaming message
    const streamingMessage: StreamingMessage = {
      id: streamingMessageId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      streamStartTime: Date.now(),
      toolCalls: [],
      chunks: []
    };
    
    console.log('[sendStreamingMessage] Adding message to chat manager');
    chatManager.addMessage(streamingMessage);
    chatManager.setAiIsGenerating(true);
    
    // Set up health check for streaming
    const setupStreamHealthCheck = () => {
      if (streamHealthCheckRef.current) {
        clearInterval(streamHealthCheckRef.current);
      }
      
      streamHealthCheckRef.current = setInterval(() => {
        const updates = streamingUpdatesRef.current.get(streamingMessageId);
        if (updates) {
          const timeSinceLastUpdate = Date.now() - updates.lastUpdate;
          console.log('[Stream Health Check]', {
            messageId: streamingMessageId,
            timeSinceLastUpdate,
            updateCount: updates.count,
            contentLength: updates.content.length
          });
          
          if (timeSinceLastUpdate > 10000) { // 10 seconds without update
            console.error('[Stream Health Check] Stream stalled!', {
              messageId: streamingMessageId,
              timeSinceLastUpdate,
              lastUpdateCount: updates.count
            });
            addDebugLog(`Stream health check: No updates for ${timeSinceLastUpdate}ms, possible stream stall`, 'warning');
            
            // Clean up stalled stream
            if (currentStreamRef.current) {
              signalRClientRef.current?.cancelStream(currentStreamRef.current);
              currentStreamRef.current = null;
            }
            chatManager.finalizeStreamingMessage(streamingMessageId);
            chatManager.setAiIsGenerating(false);
            clearInterval(streamHealthCheckRef.current!);
            streamHealthCheckRef.current = null;
          }
        }
      }, 2000); // Check every 2 seconds
    };
    
    try {
      // Set up streaming handlers first
      let chunkCount = 0;
      const startTime = Date.now();
      
      setupStreamHealthCheck();
      
      console.log('[sendStreamingMessage] Setting up streaming handlers');
      
      signalRClientRef.current.setupStreamingHandlers({
        onChunk: (data: string) => {
          chunkCount++;
          const elapsed = Date.now() - startTime;
          console.log('[Stream onChunk]', {
            chunkNumber: chunkCount,
            elapsed,
            dataLength: data.length,
            dataPreview: data.substring(0, 100),
            messageId: streamingMessageId,
            timestamp: new Date().toISOString()
          });
          
          if (data === '[DONE]') {
            // Stream complete
            console.log('[Stream onChunk] Stream completed', {
              totalChunks: chunkCount,
              duration: elapsed,
              messageId: streamingMessageId,
              finalContentLength: streamingUpdatesRef.current.get(streamingMessageId)?.content.length || 0
            });
            chatManager.finalizeStreamingMessage(streamingMessageId);
            chatManager.setAiIsGenerating(false);
            currentStreamRef.current = null;
            
            // Clean up health check
            if (streamHealthCheckRef.current) {
              clearInterval(streamHealthCheckRef.current);
              streamHealthCheckRef.current = null;
            }
            
            // Clean up tracking
            streamingUpdatesRef.current.delete(streamingMessageId);
            return;
          }
          
          try {
            const chunk: StreamChunk = JSON.parse(data);
            console.log('[Stream onChunk] Parsed chunk:', {
              chunkType: chunk.type,
              hasDelta: !!chunk.delta,
              hasContent: !!chunk.content,
              deltaLength: chunk.delta?.length || 0,
              contentLength: chunk.content?.length || 0,
              chunkId: chunk.id,
              toolCall: chunk.toolCall,
              timestamp: new Date().toISOString()
            });
            handleStreamChunkRef.current?.(streamingMessageId, chunk);
          } catch (error) {
            console.error('[Stream onChunk] Failed to parse chunk:', {
              error: error instanceof Error ? error.message : error,
              rawData: data,
              dataLength: data.length
            });
          }
        },
        onComplete: () => {
          const totalTime = Date.now() - startTime;
          console.log('[Stream onComplete]', {
            totalTime,
            totalChunks: chunkCount,
            messageId: streamingMessageId,
            finalContent: streamingUpdatesRef.current.get(streamingMessageId)?.content.substring(0, 100)
          });
          addDebugLog(`Streaming completed in ${totalTime}ms with ${chunkCount} chunks`, 'info');
          chatManager.finalizeStreamingMessage(streamingMessageId);
          chatManager.setAiIsGenerating(false);
          currentStreamRef.current = null;
          
          // Store a reference to cancel if needed
          currentStreamRef.current = { close: () => { /* No-op for now */ } } as EventSource;
          
          // Clean up health check
          if (streamHealthCheckRef.current) {
            clearInterval(streamHealthCheckRef.current);
            streamHealthCheckRef.current = null;
          }
          
          // Clean up tracking
          streamingUpdatesRef.current.delete(streamingMessageId);
        },
        onError: (error: any) => {
          console.error('[Stream onError]', {
            error: error instanceof Error ? error.message : error,
            errorType: error?.constructor?.name,
            messageId: streamingMessageId,
            chunksReceived: chunkCount,
            elapsedTime: Date.now() - startTime
          });
          addDebugLog('Streaming error occurred', 'error');
          chatManager.finalizeStreamingMessage(streamingMessageId);
          chatManager.setAiIsGenerating(false);
          currentStreamRef.current = null;
          
          // Clean up health check
          if (streamHealthCheckRef.current) {
            clearInterval(streamHealthCheckRef.current);
            streamHealthCheckRef.current = null;
          }
          
          // Clean up tracking
          streamingUpdatesRef.current.delete(streamingMessageId);
        }
      });
      
      // Start streaming via SignalR
      console.log('[sendStreamingMessage] Starting stream via SignalR');
      await signalRClientRef.current.streamChat({
        content,
        autonomyMode,
        excelContext: {} // Add context if needed
      });
      console.log('[sendStreamingMessage] Stream started successfully');
      
      // Store a reference to cancel if needed
      currentStreamRef.current = { close: () => { /* No-op for now */ } } as EventSource;
      
    } catch (error) {
      console.error('[sendStreamingMessage] Failed to start streaming:', {
        error: error instanceof Error ? error.message : error,
        errorType: error?.constructor?.name,
        messageId: streamingMessageId
      });
      addDebugLog('Failed to start streaming', 'error');
      chatManager.setAiIsGenerating(false);
    }
  }, [chatManager, addDebugLog]);

  // Add streaming session tracking
  const streamingSessionsRef = useRef<Map<string, StreamingSession>>(new Map());

  // Handle individual chunks
  const handleStreamChunk = useCallback((messageId: string, chunk: StreamChunk) => {
    const timestamp = new Date().toISOString();
    console.log('[handleStreamChunk] START Processing chunk:', {
      timestamp,
      messageId,
      chunkType: chunk.type,
      chunkId: chunk.id,
      hasDelta: !!chunk.delta,
      hasContent: !!chunk.content,
      deltaLength: chunk.delta?.length || 0,
      contentLength: chunk.content?.length || 0,
      deltaValue: chunk.delta?.substring(0, 100),
      contentValue: chunk.content?.substring(0, 100),
      phase: chunk.phase,
      metadata: chunk.metadata,
      toolCall: chunk.toolCall,
      isDone: chunk.done
    });
    
    // Don't verify message existence here - trust that it was created
    // The chatManager.messages in this closure might be stale
    
    // Track updates
    const updates = streamingUpdatesRef.current.get(messageId) || { count: 0, content: '', lastUpdate: Date.now() };
    
    switch (chunk.type) {
      case 'text':
        // Prefer delta over content to avoid duplication
        let textToAppend = '';
        
        if (chunk.delta !== undefined && chunk.delta !== null) {
          textToAppend = chunk.delta;
        } else if (chunk.content && !chunk.delta) {
          // Only use content if delta is not provided
          // This handles cases where full content is sent instead of delta
          const currentContent = updates.content || '';
          if (chunk.content.startsWith(currentContent)) {
            // Extract the delta by removing the current content prefix
            textToAppend = chunk.content.substring(currentContent.length);
          } else {
            // Fallback to content if it doesn't match expected pattern
            textToAppend = chunk.content;
          }
        }
        
        console.log('[handleStreamChunk] Text to append:', textToAppend);
        
        if (textToAppend) {
          updates.count++;
          updates.content += textToAppend;
          updates.lastUpdate = Date.now();
          streamingUpdatesRef.current.set(messageId, updates);
          
          console.log('[handleStreamChunk] Update tracking:', {
            messageId,
            updateCount: updates.count,
            totalContent: updates.content.substring(0, 50) + '...',
            totalLength: updates.content.length
          });
          
          // Update the streaming message content
          try {
            chatManager.updateStreamingMessage(messageId, {
              content: (prev: string) => {
                const newContent = prev + textToAppend;
                console.log('[handleStreamChunk] Updating content:', {
                  prevLength: prev.length,
                  appendLength: textToAppend.length,
                  newLength: newContent.length
                });
                return newContent;
              }
            });
          } catch (error) {
            console.error('[handleStreamChunk] Failed to update message:', error);
            addDebugLog(`Failed to update streaming message: ${error}`, 'error');
          }
        }
        break;
        
      case 'tool_start':
        if (chunk.toolCall) {
          chatManager.addToolIndicator(messageId, {
            id: chunk.toolCall.id,
            name: chunk.toolCall.name,
            status: 'running',
            startTime: Date.now()
          });
          addDebugLog(`Tool started: ${chunk.toolCall.name}`, 'info');
        }
        break;
        
      case 'tool_progress':
        if (chunk.toolCall) {
          // Update tool progress
          if (chunk.delta) {
            chatManager.updateToolProgress(
              messageId, 
              chunk.toolCall.id, 
              chunk.delta
            );
          }
          
          // Add visual feedback for long-running tools
          const toolName = chunk.toolCall?.name || 'tool';
          addDebugLog(`Tool progress: ${toolName} is executing...`, 'info');
          
          // Update UI to show tool is running (could trigger a loading indicator)
          // TODO: Implement tool execution state tracking
          // chatManager.setToolExecuting(messageId, chunk.toolCall.id, true);
        }
        break;
        
      case 'tool_complete':
        if (chunk.toolCall) {
          chatManager.completeToolCall(messageId, chunk.toolCall.id);
          addDebugLog(`Tool completed: ${chunk.toolCall.name}`, 'success');
          
          // In streaming mode with default autonomy, generate diff preview
          if (autonomyMode === 'default' || autonomyMode === 'agent-default') {
            const session = streamingSessionsRef.current.get(messageId);
            if (session) {
              // Add the completed tool to pending tools
              session.pendingTools.push({
                id: chunk.toolCall.id,
                name: chunk.toolCall.name,
                status: 'queued',
                input: chunk.toolCall.input
              });
              
              // Create operation for diff preview
              const operation = {
                tool: chunk.toolCall.name,
                input: chunk.toolCall.input,
                description: `Execute ${chunk.toolCall.name}`
              };
              
              // Generate diff preview
              const previewMessageId = `stream_preview_${chunk.toolCall.id}`;
              diffPreview.generatePreview(previewMessageId, [operation]).then(() => {
                addDebugLog(`Generated diff preview for streaming tool: ${chunk.toolCall.name}`, 'success');
              }).catch(error => {
                addDebugLog(`Failed to generate diff preview: ${error}`, 'error');
              });
            }
          }
        }
        break;
        
      case 'tool_status':
        if (chunk.toolCall && chunk.content) {
          try {
            const status = JSON.parse(chunk.content);
            addDebugLog(`Tool status update: ${chunk.toolCall.name} - ${status.status}`, 'info');
            
            // Update tool progress with status
            chatManager.updateToolProgress(messageId, chunk.toolCall.id, status.message || status.status);
          } catch (error) {
            console.error('[handleStreamChunk] Failed to parse tool status:', error);
          }
        }
        break;
        
      case 'phase_change':
        if (chunk.content) {
          try {
            const phaseData = JSON.parse(chunk.content);
            addDebugLog(`Streaming phase changed to: ${phaseData.phase}`, 'info');
            
            // Update or create streaming session
            let session = streamingSessionsRef.current.get(messageId);
            if (!session) {
              session = {
                messageId,
                phase: phaseData.phase,
                pendingTools: [],
                executedTools: {},
                contentChunks: [],
                startTime: Date.now(),
                lastUpdate: Date.now()
              };
              streamingSessionsRef.current.set(messageId, session);
            } else {
              session.phase = phaseData.phase;
              session.lastUpdate = Date.now();
            }
            
            // Add phase indicator to chat
            if (phaseData.phase === 'tool_execution') {
              chatManager.updateStreamingMessage(messageId, {
                metadata: { phase: phaseData.phase, tool_count: phaseData.tool_count }
              });
              addDebugLog(`Entering tool execution phase with ${phaseData.tool_count} tools`, 'info');
            } else if (phaseData.phase === 'tool_continuation') {
              chatManager.updateStreamingMessage(messageId, {
                metadata: { phase: phaseData.phase, message: phaseData.message }
              });
              addDebugLog('Continuing after tool execution', 'info');
            } else if (phaseData.phase === 'tools_complete') {
              addDebugLog('All tools executed successfully', 'success');
            }
          } catch (error) {
            console.error('[handleStreamChunk] Failed to parse phase change:', error);
          }
        }
        break;
        
      case 'tool_result':
        // Handle tool execution result
        if (chunk.content && chunk.toolCall) {
          try {
            const result = typeof chunk.content === 'string' ? JSON.parse(chunk.content) : chunk.content;
            addDebugLog(`Tool result received: ${chunk.toolCall.id} - ${result.status || 'completed'}`, 'info');
            
            // Update streaming session
            const session = streamingSessionsRef.current.get(messageId);
            if (session) {
              session.executedTools[chunk.toolCall.id] = result;
              
              // Update tool status in UI
              const tool = session.pendingTools.find(t => t.id === chunk.toolCall.id);
              if (tool) {
                tool.status = result.status === 'error' ? 'error' : 'complete';
                tool.output = result;
                tool.endTime = Date.now();
              }
              
              // Check if all tools have been executed
              const allToolsExecuted = session.pendingTools.every(tool => 
                session.executedTools[tool.id] !== undefined
              );
              
              if (allToolsExecuted && session.pendingTools.length > 0) {
                addDebugLog('All streaming tools have been executed', 'success');
                session.phase = 'final';
              }
            }
          } catch (error) {
            console.error('[handleStreamChunk] Failed to parse tool result:', error);
          }
        }
        break;
        
      case 'actions':
        // Handle actions chunk with queued operations
        if (chunk.actions && Array.isArray(chunk.actions)) {
          addDebugLog(`Received actions chunk with ${chunk.actions.length} actions`);
          
          chunk.actions.forEach((action: any) => {
            if (action.type === 'preview_queued') {
              addDebugLog(`Creating preview for queued operation: ${action.tool_type}`);
              
              // Create a preview message for the queued operation
              const previewMessage: DiffPreviewMessage = {
                id: `preview_${action.operation_id}`,
                type: 'diff-preview',
                content: '',
                timestamp: new Date(),
                requestId: action.operation_id,
                operation: {
                  tool: action.tool_type,
                  input: action.input || {},
                  description: action.description || `Execute ${action.tool_type}`
                },
                status: 'pending',
                preview: action.preview,
                previewType: action.preview_type,
                actions: {
                  accept: () => handlePreviewAcceptRef.current?.(action.operation_id),
                  reject: () => handlePreviewRejectRef.current?.(action.operation_id)
                }
              };
              
              chatManager.addMessage(previewMessage);
              addDebugLog(`Added preview message for queued operation: ${previewMessage.id}`);
              
              // Store in pending preview
              pendingPreviewRef.current.set(action.operation_id, {
                request_id: action.operation_id,
                tool: action.tool_type,
                parameters: action.input || {},
                range: action.input?.range,
                preview: true
              });
            }
          });
        }
        break;
        
      case 'error':
        if (chunk.error) {
          // Update the streaming message to show error
          chatManager.updateStreamingMessage(messageId, {
            content: chatManager.messages.find(m => m.id === messageId)?.content + `\n\nError: ${chunk.error}`
          });
          addDebugLog(`Stream error: ${chunk.error}`, 'error');
        }
        break;
    }
    
    console.log('[handleStreamChunk] END Processing chunk:', {
      timestamp: new Date().toISOString(),
      messageId,
      chunkType: chunk.type
    });
  }, [chatManager, addDebugLog]);

  // Cancel current stream
  const cancelCurrentStream = useCallback(() => {
    if (currentStreamRef.current && signalRClientRef.current) {
      signalRClientRef.current.cancelStream(currentStreamRef.current);
      currentStreamRef.current = null;
      chatManager.setAiIsGenerating(false);
      addDebugLog('Stream cancelled by user', 'warning');
    }
  }, [chatManager, addDebugLog]);

  // Clear all pending previews
  const clearAllPreviews = useCallback(async () => {
    const pendingCount = pendingPreviewRef.current.size;
    if (pendingCount === 0) {
      addDebugLog('No pending previews to clear', 'info');
      return;
    }
    
    addDebugLog(`Clearing ${pendingCount} pending previews`, 'info');
    
    // Auto-reject all pending previews
    const requestIds = Array.from(pendingPreviewRef.current.keys());
    for (const requestId of requestIds) {
      if (handlePreviewRejectRef.current) {
        await handlePreviewRejectRef.current(requestId);
      }
    }
    
    // Clear all refs
    pendingPreviewRef.current.clear();
    operationQueueRef.current = [];
    processedRequestsRef.current.clear();
    isProcessingQueueRef.current = false;
    currentOperationIndexRef.current = 0;
    totalOperationsRef.current = 0;
    
    addDebugLog('All previews cleared', 'success');
  }, [addDebugLog]);

  // Assign the refs
  useEffect(() => {
    handlePreviewAcceptRef.current = handlePreviewAccept;
    handlePreviewRejectRef.current = handlePreviewReject;
    handleStreamChunkRef.current = handleStreamChunk;
  }, [handlePreviewAccept, handlePreviewReject, handleStreamChunk]);

  return {
    handleSignalRMessage,
    handleUserMessageSent,
    setSignalRClient,
    sendFinalToolResponse,
    handlePreviewAccept,
    handlePreviewReject,
    sendStreamingMessage,
    cancelCurrentStream,
    handleStreamChunk,
    clearAllPreviews
  };
}; 