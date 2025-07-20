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

// --- Types ---
import { AutonomyMode } from './AutonomyModeSelector';
import { MentionItem, ContextItem } from '../chat/mentions';
import { isToolSuggestion, isBatchOperation } from '../../types/enhanced-chat';
import { StatusMessage } from '../../types/enhanced-chat';

// --- Zustand Store ---
import { useDiffSessionStore } from '../../store/useDiffSessionStore';

export const RefactoredChatInterface: React.FC = () => {
  // --- State Management ---
  const [autonomyMode, setAutonomyMode] = useState<AutonomyMode>(() => {
    const saved = localStorage.getItem('gridmate-autonomy-mode');
    return (saved as AutonomyMode) || 'agent-default';
  });
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState('📋 Copy All Debug Info');
  const [input, setInput] = useState('');
  
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

  // Initialize SignalR and message handlers
  const messageHandlers = useMessageHandlers(chatManager, diffPreview, autonomyMode, addDebugLog);
  const { signalRClient, connectionStatus, isAuthenticated } = useSignalRManager(messageHandlers.handleSignalRMessage, addDebugLog);
  
  // Give the message handlers access to the signalRClient once it's available
  useEffect(() => {
    messageHandlers.setSignalRClient(signalRClient);
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
      if (context.recentEdits && context.recentEdits.length > 0) {
        // Get the most recent 3 AI edits
        const recentAIEdits = context.recentEdits
          .filter(edit => edit.source === 'ai')
          .slice(-3);
        
        for (const edit of recentAIEdits) {
          const editLabel = `Recent edit: ${edit.range}`;
          contextItems.push({
            id: `edit-${edit.timestamp}`,
            type: 'edit',
            label: editLabel,
            value: edit.range,
            metadata: {
              timestamp: edit.timestamp,
              tool: edit.tool
            }
          });
        }
      }
      
      // Add cells with significant changes (if we have old/new values)
      if (context.recentEdits && context.recentEdits.length > 0) {
        const significantChanges = context.recentEdits
          .filter(edit => {
            // Check if value changed significantly
            if (edit.oldValues && edit.newValues) {
              const oldVal = edit.oldValues[0]?.[0];
              const newVal = edit.newValues[0]?.[0];
              // Consider it significant if type changed or numeric value changed by >10%
              if (typeof oldVal !== typeof newVal) return true;
              if (typeof oldVal === 'number' && typeof newVal === 'number') {
                const percentChange = Math.abs((newVal - oldVal) / oldVal);
                return percentChange > 0.1;
              }
              return oldVal !== newVal;
            }
            return false;
          })
          .slice(-2); // Take up to 2 significant changes
        
        for (const change of significantChanges) {
          if (!contextItems.find(item => item.value === change.range)) {
            contextItems.push({
              id: `change-${change.timestamp}`,
              type: 'change',
              label: `Changed: ${change.range}`,
              value: change.range,
              metadata: {
                oldValue: change.oldValues?.[0]?.[0],
                newValue: change.newValues?.[0]?.[0]
              }
            });
          }
        }
      }
      
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

  // --- Message Sending ---
  const handleSendMessage = useCallback(async () => {
    const content = input.trim();
    if (!content || !signalRClient || !isAuthenticated) return;

    const messageId = uuidv4();
    
    try {
      chatManager.addMessage({
        id: messageId,
        role: 'user',
        content,
        timestamp: new Date(),
        type: 'user',
      });
      chatManager.setIsLoading(true);
      setInput(''); // Clear input after sending

      await messageHandlers.handleUserMessageSent(messageId);

      let excelContext = null;
      if (isContextEnabled) {
        try {
          // Try comprehensive context first
          excelContext = await ExcelService.getInstance().getComprehensiveContext({ 
            includeAllSheets: true,
            maxCellsPerSheet: 10000 
          });
          
          // Use full sheet as selected context if no specific selection
          if (excelContext?.visibleRangeData && 
              (!excelContext.selectedData || excelContext.selectedRange === 'A1')) {
            excelContext.selectedData = excelContext.visibleRangeData;
            excelContext.selectedRange = excelContext.visibleRangeData.address;
          }
        } catch (error) {
          console.warn('Failed to get comprehensive context, falling back to smart context:', error);
          addDebugLog('Comprehensive context failed, using smart context fallback', 'warning');
          // Fallback to smart context
          excelContext = await ExcelService.getInstance().getSmartContext();
        }
      }
      
      // Update context summary
      if (excelContext?.workbookSummary) {
        const sheets = excelContext.workbookSummary.sheets.length;
        const totalCells = excelContext.workbookSummary.totalCells;
        const activeSheet = excelContext.worksheet;
        const selectedCells = excelContext.selectedData ? 
          excelContext.selectedData.rowCount * excelContext.selectedData.colCount : 0;
        
        setContextSummary(
          `Context: ${activeSheet} (${selectedCells} cells selected) + ${sheets - 1} other sheets (${totalCells.toLocaleString()} total cells)`
        );
      }
      
      // Debug logging for context
      console.log('🔍 [CONTEXT DEBUG] Context Enabled:', isContextEnabled);
      console.log('🔍 [CONTEXT DEBUG] Raw Excel Context from getComprehensiveContext():', excelContext);
      
      if (excelContext) {
        console.log('🔍 [CONTEXT DEBUG] Breakdown:');
        console.log('  - Worksheet:', excelContext.worksheet);
        console.log('  - Workbook:', excelContext.workbook);
        console.log('  - Selected Range:', excelContext.selectedRange);
        console.log('  - Selected Data:', excelContext.selectedData);
        console.log('  - Visible Range Data:', excelContext.visibleRangeData);
        console.log('  - Workbook Summary:', excelContext.workbookSummary);
        console.log('  - Nearby Data:', excelContext.nearbyData);
        
        // Log cell values if present
        if (excelContext.selectedData?.values) {
          console.log('📊 [CONTEXT DEBUG] Selected Cell Values:', 
            excelContext.selectedData.values.slice(0, 5).map(row => row.slice(0, 5))
          );
        }
        
        if (excelContext.nearbyData?.values) {
          console.log('📊 [CONTEXT DEBUG] Nearby Cell Values (first 5x5):', 
            excelContext.nearbyData.values.slice(0, 5).map(row => row.slice(0, 5))
          );
        }
      }
      
      // Build the message payload
      const messagePayload = {
        type: 'chat_message',
        data: {
          messageId,
          content,
          excelContext: {
            workbook: excelContext?.workbook,
            worksheet: excelContext?.worksheet,
            selectedRange: excelContext?.selectedRange,
            selectedData: excelContext?.selectedData,
            visibleRangeData: excelContext?.visibleRangeData,     // ADD: full active sheet data
            workbookSummary: excelContext?.workbookSummary,       // ADD: workbook summary
            nearbyData: excelContext?.nearbyData,
            fullSheetData: excelContext?.fullSheetData,           // KEEP: existing field
            recentEdits: excelContext?.recentEdits,               // KEEP: recent edits tracking
            activeContext: activeContext.map(c => ({ type: c.type, value: c.value }))
          },
          autonomyMode,
        },
      };
      
      console.log('📤 [CONTEXT DEBUG] Full Message Payload to SignalR:', JSON.stringify(messagePayload, null, 2));
      console.log('📤 [CONTEXT DEBUG] What AI will receive - Excel Context:', messagePayload.data.excelContext);
      
      await signalRClient.send(messagePayload);
    } catch (error) {
      console.error('Failed to send message:', error);
      chatManager.setIsLoading(false);
      chatManager.setAiIsGenerating(false);
      // Add error message to chat
      chatManager.addMessage({
        id: `error_${Date.now()}`,
        role: 'system',
        content: '❌ Failed to send message. Please check your connection and try again.',
        timestamp: new Date(),
        type: 'error',
      });
    }
  }, [input, signalRClient, isAuthenticated, chatManager, messageHandlers, isContextEnabled, activeContext, autonomyMode]);

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