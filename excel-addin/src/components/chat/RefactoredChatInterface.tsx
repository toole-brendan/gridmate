/// <reference types="@types/office-js" />
import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

// --- Core Hooks ---
import { useSignalRManager } from '../../hooks/useSignalRManager';
import { useChatManager } from '../../hooks/useChatManager';
import { useMessageHandlers } from '../../hooks/useMessageHandlers';
import { useDiffPreview } from '../../hooks/useDiffPreview';
import { useDebounce } from '../../hooks/useDebounce';

// --- UI Components ---
import { EnhancedChatInterface } from './EnhancedChatInterface';
import { EnhancedAutonomySelector } from './EnhancedAutonomySelector';

// --- Services and Utils ---
import { ExcelService } from '../../services/excel/ExcelService';
import { AuditLogger } from '../../utils/safetyChecks';
import { conditionalLog } from '../../config/logging';

// --- Types ---
import { AutonomyMode } from './AutonomyModeSelector';
import { MentionItem, ContextItem } from '../chat/mentions';
import { isToolSuggestion, isBatchOperation, ToolSuggestionMessage, isDiffPreview } from '../../types/enhanced-chat';
import { StatusMessage } from '../../types/enhanced-chat';
import { isStreamingMessage } from '../../types/streaming';
import { StreamingMessage } from './messages/StreamingMessage';

// --- Zustand Store ---
import { useDiffSessionStore } from '../../store/useDiffSessionStore';
import { usePersistedTokenUsage } from '../../hooks/usePersistedTokenUsage';

// Helper function for component-specific logging
const chatLog = (category: string, ...args: any[]) => {
  conditionalLog('CHAT_INTERFACE', category, ...args);
};

// Interface for tracking pending tool suggestions
interface PendingToolState {
  suggestions: Map<string, ToolSuggestionMessage>;
  isProcessingBulk: boolean;
  bulkProgress?: {
    total: number;
    completed: number;
    failed: number;
    currentOperation?: string;
  };
}

export const RefactoredChatInterface: React.FC = () => {
  // --- State Management ---
  const [autonomyMode, setAutonomyMode] = useState<AutonomyMode>(() => {
    const saved = localStorage.getItem('gridmate-autonomy-mode');
    return (saved as AutonomyMode) || 'agent-default';
  });
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState('📋 Copy All Debug Info');
  const [input, setInput] = useState('');
  
  // State for tracking pending tool suggestions
  const [pendingTools, setPendingTools] = useState<PendingToolState>({
    suggestions: new Map(),
    isProcessingBulk: false
  });
  
  // --- Hooks ---
  const chatManager = useChatManager();
  const diffPreview = useDiffPreview(chatManager);
  
  // Get activePreview from the session store
  const { activePreview } = useDiffSessionStore();

  // Component-level debug logs
  const [debugLogs, setDebugLogs] = useState<Array<{time: string, message: string, type: 'info' | 'error' | 'warning' | 'success'}>>([]);
  const addDebugLog = useCallback((message: string, type: 'info' | 'error' | 'warning' | 'success' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev.slice(-100), { time, message, type }]); // Keep last 100 logs
    console.log(`[${time}] [${type.toUpperCase()}] ${message}`);
  }, []);

  // Get session ID from SignalR client
  const [sessionId, setSessionId] = useState<string>('default');
  
  // Token usage management
  const { tokenUsage, updateTokenUsage, clearTokenUsage } = usePersistedTokenUsage(sessionId);
  
  // Initialize SignalR and message handlers with token usage callback
  const messageHandlers = useMessageHandlers(chatManager, diffPreview, autonomyMode, addDebugLog, updateTokenUsage);
  const { signalRClient, connectionStatus, isAuthenticated } = useSignalRManager(messageHandlers.handleSignalRMessage, addDebugLog);
  
  // Give the message handlers access to the signalRClient once it's available
  useEffect(() => {
    messageHandlers.setSignalRClient(signalRClient);
    // Update session ID when SignalR client is available
    if (signalRClient && (signalRClient as any).sessionId) {
      setSessionId((signalRClient as any).sessionId);
    }
  }, [signalRClient, messageHandlers]);

  // Clear loading states on disconnection
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      chatManager.setIsLoading(false);
      chatManager.setAiIsGenerating(false);
    }
  }, [connectionStatus, chatManager]);

  // --- Mention and Context System ---
  const [availableMentions, setAvailableMentions] = useState<MentionItem[]>([]);
  const [activeContext, setActiveContext] = useState<ContextItem[]>([]);
  const [isContextEnabled, setIsContextEnabled] = useState(true); // Default to true so AI can see spreadsheet data
  const [rawSelection, setRawSelection] = useState<string | null>(null);
  const debouncedSelection = useDebounce(rawSelection, 300);
  const [contextSummary, setContextSummary] = useState<string>('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const updateAvailableMentions = useCallback(async () => {
    addDebugLog('Updating available mentions...');
    try {
      const context = await ExcelService.getInstance().getSmartContext();
      const mentions: MentionItem[] = [];
      
      // Track user selection (this is called after selection changes)
      if (context.selectedRange) {
        ExcelService.getInstance().trackUserSelection(context.selectedRange);
        addDebugLog(`Tracked user selection: ${context.selectedRange}`);
      }
      
      // For now, just add the current worksheet as a mention
      if (context.worksheet) {
        mentions.push({ 
          id: `sheet-${context.worksheet}`, 
          type: 'sheet', 
          label: context.worksheet, 
          value: `@${context.worksheet}`, 
          description: 'Current worksheet' 
        });
      }
      
      // TODO: Add support for tables and named ranges when API methods are available
      
      setAvailableMentions(mentions);

      const contextItems: ContextItem[] = [];
      
      // Add current selection
      if (context.selectedRange) {
        const hasSheetPrefix = context.selectedRange.includes('!');
        const label = hasSheetPrefix ? `Context: ${context.selectedRange}` : `Context: ${context.worksheet || 'Sheet'}!${context.selectedRange}`;
        contextItems.push({ id: 'selection', type: 'selection', label: label, value: context.selectedRange });
      }
      
      // Auto-add recent AI edits as context pills
      // COMMENTED OUT: Removing auto-populated context pills to reduce UI clutter
      // if (context.recentEdits && context.recentEdits.length > 0) {
      //   // Get the most recent 3 AI edits
      //   const recentAIEdits = context.recentEdits
      //     .filter(edit => edit.source === 'ai')
      //     .slice(-3);
      //   
      //   for (const edit of recentAIEdits) {
      //     const editLabel = `Recent edit: ${edit.range}`;
      //     contextItems.push({
      //       id: `edit-${edit.timestamp}`,
      //       type: 'edit',
      //       label: editLabel,
      //       value: edit.range,
      //       metadata: {
      //         timestamp: edit.timestamp,
      //         tool: edit.tool
      //       }
      //     });
      //   }
      // }
      
      // Add cells with significant changes (if we have old/new values)
      // COMMENTED OUT: Removing auto-populated context pills to reduce UI clutter
      // if (context.recentEdits && context.recentEdits.length > 0) {
      //   const significantChanges = context.recentEdits
      //     .filter(edit => {
      //       // Check if value changed significantly
      //       if (edit.oldValues && edit.newValues) {
      //         const oldVal = edit.oldValues[0]?.[0];
      //         const newVal = edit.newValues[0]?.[0];
      //         // Consider it significant if type changed or numeric value changed by >10%
      //         if (typeof oldVal !== typeof newVal) return true;
      //         if (typeof oldVal === 'number' && typeof newVal === 'number') {
      //           const percentChange = Math.abs((newVal - oldVal) / oldVal);
      //           return percentChange > 0.1;
      //         }
      //         return oldVal !== newVal;
      //       }
      //       return false;
      //     })
      //     .slice(-2); // Take up to 2 significant changes
      //   
      //   for (const change of significantChanges) {
      //     if (!contextItems.find(item => item.value === change.range)) {
      //       contextItems.push({
      //         id: `change-${change.timestamp}`,
      //         type: 'change',
      //         label: `Changed: ${change.range}`,
      //         value: change.range,
      //         metadata: {
      //           oldValue: change.oldValues?.[0]?.[0],
      //           newValue: change.newValues?.[0]?.[0]
      //         }
      //       });
      //     }
      //   }
      // }
      
      setActiveContext(contextItems);
    } catch (error) {
      addDebugLog(`Failed to update mentions: ${error}`, 'error');
    }
  }, [addDebugLog]);
  
  // Update context pills when AI finishes generating
  useEffect(() => {
    if (!chatManager.aiIsGenerating) {
      // Small delay to ensure Excel has processed any changes
      const timeoutId = setTimeout(() => {
        updateAvailableMentions();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [chatManager.aiIsGenerating, updateAvailableMentions]);

  const initializeContextAndMentions = useCallback(async () => {
    addDebugLog('Initializing context and mentions on load...');
    try {
      const context = await ExcelService.getInstance().getSmartContext();
      const mentions: MentionItem[] = [];
      
      if (context.worksheet) {
        mentions.push({ 
          id: `sheet-${context.worksheet}`, 
          type: 'sheet', 
          label: context.worksheet, 
          value: `@${context.worksheet}`, 
          description: 'Current worksheet' 
        });
      }
      
      setAvailableMentions(mentions);

      // Set a placeholder context item that shows as grayed out
      const placeholderContext: ContextItem[] = [{
        id: 'no-selection',
        type: 'selection',
        label: 'NO RANGE SELECTED', // Changed to uppercase to match the hardcoded version
        value: '',
        removable: false
      }];
      setActiveContext(placeholderContext);

    } catch (error) {
      addDebugLog(`Failed to initialize context: ${error}`, 'error');
    }
  }, [addDebugLog]);

  useEffect(() => {
    if (debouncedSelection) {
      updateAvailableMentions();
    }
  }, [debouncedSelection, updateAvailableMentions]);

  useEffect(() => {
    addDebugLog('Initializing selection change listener...');
    const setupListener = async () => {
      try {
        await Excel.run(async (context) => {
          const worksheet = context.workbook.worksheets.getActiveWorksheet();
          worksheet.onSelectionChanged.add(async () => {
            setRawSelection(`selection_${Date.now()}`);
          });
          await context.sync();
          addDebugLog('Selection change listener registered.', 'success');
        });
      } catch (error) {
        addDebugLog(`Failed to set up selection listener: ${error}`, 'error');
      }
    };
    setupListener();
    initializeContextAndMentions(); // Use the new initialization function
  }, [addDebugLog, initializeContextAndMentions]);

  const handleMentionSelect = (mention: MentionItem) => {
    addDebugLog(`Mention selected: ${mention.value}`);
    if (['sheet', 'table', 'namedRange'].includes(mention.type)) {
      setActiveContext(prev => {
        if (prev.some(item => item.value === mention.value)) return prev;
        return [...prev, { id: mention.id, type: mention.type as any, label: mention.label, value: mention.value, removable: true }];
      });
    }
  };

  const handleContextRemove = (id: string) => {
    addDebugLog(`Context removed: ${id}`);
    setActiveContext(prev => prev.filter(item => item.id !== id));
  };

  const handleContextClick = () => {
    // This function becomes the explicit activation/deactivation handler
    setIsContextEnabled(!isContextEnabled);
    if (!isContextEnabled) {
      addDebugLog('Context explicitly activated by user.', 'success');
    } else {
      addDebugLog('Context deactivated by user.', 'info');
    }
  };

  // Track pending tool suggestions and diff previews
  useEffect(() => {
    const pending = new Map<string, any>();
    chatManager.messages.forEach(msg => {
      // Include both tool-suggestion messages and diff-preview messages
      if (isToolSuggestion(msg) && msg.status === 'pending') {
        pending.set(msg.tool.id, msg);
      } else if (isDiffPreview(msg) && msg.status === 'pending') {
        // For diff-preview messages, create a compatible structure
        const toolSuggestion = {
          ...msg,
          tool: {
            id: msg.requestId,
            name: msg.operation.tool,
            description: msg.operation.description,
            parameters: msg.operation.input
          },
          actions: msg.actions
        };
        pending.set(msg.requestId, toolSuggestion);
      }
    });
    chatLog('STATE_UPDATES', '[RefactoredChatInterface] Updated pending tools:', pending.size, 'items');
    setPendingTools(prev => ({ ...prev, suggestions: pending }));
  }, [chatManager.messages]);

  // --- Message Sending ---
  const handleSendMessage = useCallback(async () => {
    const content = input.trim();
    if (!content || !signalRClient || !isAuthenticated) return;

    // Check if we're already streaming
    if (chatManager.aiIsGenerating) {
      addDebugLog('Already generating response', 'warning');
      return;
    }

    const messageId = uuidv4();
    
    try {
      // Add user message
      chatManager.addMessage({
        id: messageId,
        role: 'user',
        content,
        timestamp: new Date(),
        type: 'user',
      });
      
      // Clear input immediately
      setInput('');

      // Send streaming message
      await messageHandlers.sendStreamingMessage(content, autonomyMode);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      chatManager.setIsLoading(false);
      chatManager.setAiIsGenerating(false);
      addDebugLog('Failed to send message', 'error');
    }
  }, [input, signalRClient, isAuthenticated, chatManager, messageHandlers, autonomyMode, addDebugLog]);

  // --- UI Actions ---
  const handleAutonomyModeChange = (mode: AutonomyMode) => {
    setAutonomyMode(mode);
    localStorage.setItem('gridmate-autonomy-mode', mode);
    addDebugLog(`Autonomy mode changed to: ${mode}`);
    const modeDescriptions = {
      'ask': 'Read-only mode activated. AI can analyze but not make changes.',
      'agent-default': 'Default mode activated. AI will suggest changes for your approval.',
      'agent-yolo': '⚡ YOLO mode activated. AI will apply changes automatically!',
    };
    chatManager.addMessage({
      id: `system_${Date.now()}`,
      role: 'system',
      content: modeDescriptions[mode],
      timestamp: new Date(),
      type: 'system',
    });
  };

  // Helper function for sequential execution
  const executeSequentially = async (
    operations: ToolSuggestionMessage[],
    progress: { completed: number; failed: number },
    errors: Array<{ actionId: string; error: Error }>
  ) => {
    for (const operation of operations) {
      // Check if aborted
      if (abortController?.signal.aborted) {
        throw new Error('Operation cancelled by user');
      }
      
      try {
        if (operation.actions?.accept) {
          await operation.actions.accept();
          progress.completed++;
          updateToolStatus(operation.tool.id, 'accepted');
        }
      } catch (error) {
        progress.failed++;
        errors.push({ 
          actionId: operation.tool.id, 
          error: error as Error 
        });
        addDebugLog(`Failed to accept ${operation.tool.name}: ${(error as Error).message}`, 'error');
      }
      
      // Small delay between operations for UI feedback
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  };

  // Update tool suggestion status in messages
  const updateToolStatus = (toolId: string, status: 'accepted' | 'rejected') => {
    chatManager.messages.forEach(msg => {
      if (isToolSuggestion(msg) && msg.tool.id === toolId) {
        // Note: We would need to update the message through chatManager
        // This might require adding a method to chatManager to update message status
        addDebugLog(`Updated tool ${toolId} status to ${status}`);
      }
    });
  };

  // Group consecutive operations by tool type
  const groupOperationsByType = (operations: ToolSuggestionMessage[]): Map<string, ToolSuggestionMessage[]> => {
    const groups = new Map<string, ToolSuggestionMessage[]>();
    
    operations.forEach(op => {
      const toolType = op.tool.name;
      if (!groups.has(toolType)) {
        groups.set(toolType, []);
      }
      groups.get(toolType)!.push(op);
    });
    
    return groups;
  };

  // Check if a tool type supports batch execution
  const isBatchableToolType = (toolType: string): boolean => {
    const batchableTools = [
      'write_range',
      'apply_formula',
      'format_range',
      'clear_range',
      'apply_layout'
    ];
    return batchableTools.includes(toolType);
  };

  // Handle Accept All action
  const handleAcceptAll = useCallback(async () => {
    chatLog('MESSAGE_FLOW', '[RefactoredChatInterface] handleAcceptAll called');
    const pendingActions = Array.from(pendingTools.suggestions.values());
    const pendingCount = pendingActions.length;
    
    chatLog('DEBUG_INFO', '[RefactoredChatInterface] pendingActions:', pendingActions);
    chatLog('DEBUG_INFO', '[RefactoredChatInterface] pendingCount:', pendingCount);
    
    // Don't proceed if no pending actions
    if (pendingCount === 0) {
      chatLog('MESSAGE_FLOW', '[RefactoredChatInterface] No pending actions, returning');
      return;
    }
    
    // Confirmation for large batches
    if (pendingCount > 10) {
      const confirmMessage = `This will apply ${pendingCount} changes to your spreadsheet. Continue?`;
      if (!window.confirm(confirmMessage)) return;
    }
    
    addDebugLog(`Starting bulk acceptance of ${pendingCount} operations`);
    setPendingTools(prev => ({ ...prev, isProcessingBulk: true }));
    
    // Create abort controller for this operation
    const controller = new AbortController();
    setAbortController(controller);
    
    // Initialize progress tracking
    const progress = { total: pendingCount, completed: 0, failed: 0 };
    const errors: Array<{ actionId: string; error: Error }> = [];
    
    try {
      // Group operations by type for batch optimization
      const grouped = groupOperationsByType(pendingActions);
      
      for (const [toolType, operations] of grouped) {
        // Check if aborted
        if (controller.signal.aborted) {
          throw new Error('Operation cancelled by user');
        }
        
        // Check if this tool type supports batching
        if (isBatchableToolType(toolType) && operations.length > 1) {
          try {
            // Use batch execution for multiple operations of same type
            const batchRequests = operations.map(op => {
              // For diff-preview operations, parameters contains the full tool request
              // Extract the actual parameters (excluding tool name and request_id)
              const { tool, request_id, ...actualParameters } = op.tool.parameters;
              chatLog('DEBUG_INFO', '[AcceptAll Debug] Tool:', op.tool.name);
              chatLog('DEBUG_INFO', '[AcceptAll Debug] Extracted parameters:', actualParameters);
              return {
                tool: op.tool.name,
                input: actualParameters
              };
            });
            
            await ExcelService.getInstance().batchExecuteToolRequests(batchRequests);
            
            // Update all operations in batch as completed
            operations.forEach(op => {
              updateToolStatus(op.tool.id, 'accepted');
              progress.completed++;
            });
          } catch (error) {
            // If batch fails, fall back to individual execution
            addDebugLog(`Batch execution failed for ${toolType}, falling back to sequential`, 'warning');
            await executeSequentially(operations, progress, errors);
          }
        } else {
          // Execute non-batchable operations sequentially
          await executeSequentially(operations, progress, errors);
        }
        
        // Update progress UI
        setPendingTools(prev => ({
          ...prev,
          bulkProgress: { ...progress, currentOperation: toolType }
        }));
        
        // Small delay between different tool types
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Show completion summary
      const summaryMessage = `Bulk operation completed: ${progress.completed} successful, ${progress.failed} failed out of ${pendingCount} total.`;
      addDebugLog(summaryMessage, progress.failed > 0 ? 'warning' : 'success');
      
      // Add completion message to chat
      chatManager.addMessage({
        id: `bulk_complete_${Date.now()}`,
        role: 'system',
        content: summaryMessage,
        timestamp: new Date(),
        type: 'system',
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`Bulk operation failed: ${errorMessage}`, 'error');
    } finally {
      setPendingTools(prev => ({ 
        ...prev, 
        isProcessingBulk: false,
        bulkProgress: undefined
      }));
      setAbortController(null);
    }
  }, [pendingTools.suggestions, addDebugLog, chatManager]);

  // Handle Reject All action
  const handleRejectAll = useCallback(async () => {
    const pendingActions = Array.from(pendingTools.suggestions.values());
    const pendingCount = pendingActions.length;
    
    if (pendingCount === 0) return;
    
    addDebugLog(`Rejecting all ${pendingCount} operations`);
    
    pendingActions.forEach(operation => {
      if (operation.actions?.reject) {
        operation.actions.reject();
        updateToolStatus(operation.tool.id, 'rejected');
      }
    });
    
    chatManager.addMessage({
      id: `bulk_reject_${Date.now()}`,
      role: 'system',
      content: `Rejected ${pendingCount} pending operations.`,
      timestamp: new Date(),
      type: 'system',
    });
  }, [pendingTools.suggestions, addDebugLog, chatManager]);

  const handleMessageAction = (messageId: string, action: string) => {
    const message = chatManager.messages.find(m => m.id === messageId);
    if (message && isToolSuggestion(message)) {
      // This logic would be handled by the message handlers now
      console.log(`Action '${action}' on tool ${message.tool.name} would be handled here.`);
    } else if (message && isBatchOperation(message)) {
      // This logic would be handled by the message handlers now
      console.log(`Action '${action}' on batch operation would be handled here.`);
    }
  };
  
  const handleClearChat = () => {
    // Clear the chat messages
    chatManager.clearMessages();
    
    // Clear token usage
    clearTokenUsage();
    
    // Reset the operation counters in messageHandlers
    // This ensures the next message starts with fresh counters
    if (messageHandlers.handleUserMessageSent) {
      // Call handleUserMessageSent with a dummy ID to trigger the reset
      // The counters are reset at the beginning of this function
      messageHandlers.handleUserMessageSent('clear-chat-reset');
    }
    
    addDebugLog('Chat cleared and operation counters reset');
  };
  
  const handleCopyDebugInfo = async () => {
    setCopyButtonText('⏳ Copying...');
    addDebugLog('Copy debug info initiated');
    try {
      const auditLogs = AuditLogger.getRecentLogs(10).reverse().map(log =>
        `${new Date(log.timestamp).toLocaleTimeString()} - ${log.toolName} - ${log.result} ${log.autonomyMode ? `(${log.autonomyMode})` : ''}${log.error ? ` - Error: ${log.error}` : ''}`
      ).join('\n');

      const debugLogsText = debugLogs.map(log => `[${log.time}] [${log.type.toUpperCase()}] ${log.message}`).join('\n');

      const sessionId = (signalRClient as any)?.sessionId || 'N/A'; // Access sessionId with type assertion

      const debugInfo = `Debug Info - ${new Date().toISOString()}
=====================================
=== Connection Info ===
Session ID: ${sessionId}
Mode: ${autonomyMode}
Connection: ${connectionStatus} ${isAuthenticated ? '(authenticated)' : ''}

=== Debug Logs (${debugLogs.length} entries) ===
${debugLogsText || 'No debug logs.'}

=== Audit Logs (last 10) ===
${auditLogs || 'No audit logs.'}
`;
      await navigator.clipboard.writeText(debugInfo);
      setCopyButtonText('✅ Copied!');
      addDebugLog('Debug info copied to clipboard', 'success');
    } catch (error) {
      setCopyButtonText('❌ Copy Failed');
      addDebugLog('Failed to copy debug info', 'error');
    } finally {
      setTimeout(() => setCopyButtonText('📋 Copy All Debug Info'), 3000);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+. or Ctrl+. to cycle through modes
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        const modes: AutonomyMode[] = ['ask', 'agent-default', 'agent-yolo'];
        const currentIndex = modes.indexOf(autonomyMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        handleAutonomyModeChange(modes[nextIndex]);
        
        // Visual feedback with a brief flash effect
        const flashElement = document.createElement('div');
        flashElement.className = 'fixed inset-0 bg-blue-500 opacity-0 pointer-events-none z-50';
        flashElement.style.transition = 'opacity 150ms';
        document.body.appendChild(flashElement);
        
        // Trigger flash
        requestAnimationFrame(() => {
          flashElement.style.opacity = '0.1';
          setTimeout(() => {
            flashElement.style.opacity = '0';
            setTimeout(() => flashElement.remove(), 150);
          }, 150);
        });
      }
      
      // Show keyboard shortcuts help with Cmd+/
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        const helpMessage: StatusMessage = {
          id: `help_${Date.now()}`,
          type: 'status',
          content: '',
          timestamp: new Date(),
          status: {
            type: 'info',
            message: 'Keyboard Shortcuts',
            details: `${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+. : Switch autonomy mode\n${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+L : Focus chat input\nEnter : Approve focused action\nEscape : Reject focused action\n↑/↓ : Navigate between actions`
          },
          animated: false
        };
        chatManager.addMessage(helpMessage);
        setTimeout(() => chatManager.removeMessage(helpMessage.id), 5000);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [autonomyMode, handleAutonomyModeChange, chatManager]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--app-background)' }}>
      {/* --- Status Bar --- */}
      {(connectionStatus !== 'connected' || !isAuthenticated) && (
        <div className={`px-4 py-2 text-sm font-medium text-white ${connectionStatus === 'connecting' ? 'bg-yellow-600' : 'bg-red-600'}`}>
          {connectionStatus === 'connecting' ? '🔄 Connecting...' : connectionStatus === 'disconnected' ? '❌ Disconnected' : '🔐 Authenticating...'}
        </div>
      )}

      {/* --- Context Summary --- */}
      {contextSummary && (
        <div className="text-xs text-gray-500 px-4 py-2 bg-gray-50 border-b border-gray-200">
          {contextSummary}
        </div>
      )}

      {/* --- Bulk Operation Progress --- */}
      {pendingTools.isProcessingBulk && pendingTools.bulkProgress && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 min-w-[300px] z-50">
          <div className="flex justify-between mb-2">
            <span className="font-semibold">Processing Operations</span>
            <span className="text-sm text-gray-600">
              {pendingTools.bulkProgress.completed + pendingTools.bulkProgress.failed} / {pendingTools.bulkProgress.total}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${((pendingTools.bulkProgress.completed + pendingTools.bulkProgress.failed) / pendingTools.bulkProgress.total) * 100}%` 
              }}
            />
          </div>
          
          {pendingTools.bulkProgress.currentOperation && (
            <div className="text-sm text-gray-600">
              Current: {pendingTools.bulkProgress.currentOperation}
            </div>
          )}
          
          {pendingTools.bulkProgress.failed > 0 && (
            <div className="text-sm text-red-600 mt-1">
              {pendingTools.bulkProgress.failed} operations failed
            </div>
          )}
          
          {abortController && (
            <button 
              onClick={() => abortController.abort()}
              className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              Stop Bulk Operation
            </button>
          )}
        </div>
      )}
      
      {/* --- Chat UI --- */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <EnhancedChatInterface
          messages={chatManager.messages}
          input={input}
          setInput={setInput}
          handleSendMessage={handleSendMessage}
          isLoading={chatManager.isLoading}
          aiIsGenerating={chatManager.aiIsGenerating}
          autonomySelector={<EnhancedAutonomySelector currentMode={autonomyMode} onModeChange={handleAutonomyModeChange} />}
          onMessageAction={handleMessageAction}
          availableMentions={availableMentions}
          activeContext={activeContext}
          onContextRemove={handleContextRemove}
          onMentionSelect={handleMentionSelect}
          isContextEnabled={isContextEnabled}
          onContextToggle={handleContextClick}
          onClearChat={handleClearChat}
          onAcceptDiff={() => diffPreview.acceptCurrentPreview(messageHandlers.sendFinalToolResponse)}
          onRejectDiff={diffPreview.rejectCurrentPreview}
          tokenUsage={tokenUsage}
          // Add bulk action props
          pendingToolsCount={pendingTools.suggestions.size}
          onAcceptAll={handleAcceptAll}
          onRejectAll={handleRejectAll}
          isProcessingBulkAction={pendingTools.isProcessingBulk}
          // Add streaming control
          onCancelStream={messageHandlers.cancelCurrentStream}
        />
      </div>

      {/* --- Debug Panel --- */}
      <details open={isDebugOpen} style={{ borderTop: '1px solid #374151', backgroundColor: '#1f2937', fontSize: '11px', padding: '8px 12px', color: '#e5e7eb' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'medium' }} onClick={(e) => { e.preventDefault(); setIsDebugOpen(!isDebugOpen); }}>
          Debug Info
        </summary>
        <div style={{ marginTop: '8px', fontFamily: 'monospace' }}>
          <div>Session: {(signalRClient as any)?.sessionId || 'N/A'}</div>
          <div>Mode: {autonomyMode}</div>
          <div>Connection: {connectionStatus} {isAuthenticated ? '(auth)' : ''}</div>
          <div>Active Preview: {activePreview ? `Message ${activePreview.messageId}` : 'None'}</div>
          <button onClick={handleCopyDebugInfo} style={{ marginTop: '8px', padding: '4px 8px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {copyButtonText}
          </button>

          <details style={{ marginTop: '8px' }}>
            <summary>Debug Logs ({debugLogs.length})</summary>
            <div style={{ marginTop: '4px', maxHeight: '200px', overflowY: 'auto', backgroundColor: '#0d1117', padding: '8px', borderRadius: '4px' }}>
              {debugLogs.map((log, index) => <div key={index} style={{ color: log.type === 'error' ? '#ff6b6b' : log.type === 'success' ? '#6bcf7f' : '#8b949e' }}>[{log.time}] {log.message}</div>)}
            </div>
          </details>

        </div>
      </details>
    </div>
  );
};