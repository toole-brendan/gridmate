/// <reference types="@types/office-js" />
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { EnhancedChatInterface } from './EnhancedChatInterface'
import { ChatMessage } from '../../types/chat'
import { useDebounce } from '../../hooks/useDebounce'
import { 
  EnhancedChatMessage, 
  ToolSuggestionMessage, 
  ToolResultMessage,
  BatchOperationMessage,
  ResponseToolsGroupMessage,
  StatusMessage,
  isToolSuggestion,
  isBatchOperation,
  isResponseToolsGroup
} from '../../types/enhanced-chat'
import { SignalRClient } from '../../services/signalr/SignalRClient'
import { useOperationQueue } from '../../hooks/useOperationQueue'
import { ExcelService } from '../../services/excel/ExcelService'
import { AutonomyMode } from './AutonomyModeSelector'
import { EnhancedAutonomySelector } from './EnhancedAutonomySelector'
import { checkToolSafety, AuditLogger } from '../../utils/safetyChecks'
import { MentionItem, ContextItem } from '../chat/mentions'
import { useDiffPreview } from '../../hooks/useDiffPreview'
import { DiffPreviewBar } from './DiffPreviewBar'
import { AISuggestedOperation } from '../../types/diff'
import { useLogStore, log as logToStore } from '../../store/logStore'

// Global SignalR client instance to prevent multiple connections
let globalSignalRClient: SignalRClient | null = null
let globalSessionId: string = `session_${Date.now()}`

// Define write tools that should trigger visual diff
const WRITE_TOOLS = new Set(['write_range', 'apply_formula', 'clear_range', 'smart_format_cells', 'format_range']);

export const EnhancedChatInterfaceWithSignalR: React.FC = () => {
  const [messages, setMessages] = useState<EnhancedChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const signalRClient = useRef<SignalRClient | null>(globalSignalRClient)
  const sessionIdRef = useRef<string>(globalSessionId)
  const [aiIsGenerating, setAiIsGenerating] = useState(false)
  const toolRequestQueue = useRef<Map<string, any>>(new Map())
  
  // State for pending diff operations
  const [pendingDiffOps, setPendingDiffOps] = useState<AISuggestedOperation[]>([])
  
  // State for debug container
  const [isDebugOpen, setIsDebugOpen] = useState(false)
  const [copyButtonText, setCopyButtonText] = useState('📋 Copy All Debug Info')
  const [showDebugText, setShowDebugText] = useState(false)
  
  // Response tracking for bulk approval
  const [currentResponseId, setCurrentResponseId] = useState<string | null>(null)
  const [pendingResponseTools, setPendingResponseTools] = useState<Map<string, ToolSuggestionMessage[]>>(new Map())
  const [showPendingToolsBar, setShowPendingToolsBar] = useState(false)
  const [isProcessingBulkAction, setIsProcessingBulkAction] = useState(false)
  
  // Calculate pending tools count - count ALL pending tool suggestions
  const pendingToolsCount = messages.filter(msg => 
    isToolSuggestion(msg) && 
    msg.status === 'pending'
  ).length
  
  // Debug logs state
  const [debugLogs, setDebugLogs] = useState<Array<{time: string, message: string, type: 'info' | 'error' | 'warning' | 'success'}>>([])
  const addDebugLog = useCallback((message: string, type: 'info' | 'error' | 'warning' | 'success' = 'info') => {
    const time = new Date().toLocaleTimeString()
    setDebugLogs(prev => [...prev.slice(-50), { time, message, type }]) // Keep last 50 logs
    console.log(`[${time}] [${type.toUpperCase()}] ${message}`)
  }, [])
  
  // Get logs from the centralized logStore
  const allLogs = useLogStore((state: any) => state.logs)
  const visualDiffLogs = allLogs.filter((log: any) => log.source === 'visual-diff')
  
  // Test visual diff logging
  useEffect(() => {
    logToStore('visual-diff', '[TEST] Visual diff logging system test - if you see this, logging works!');
  }, [])
  
  // Mention system state
  const [availableMentions, setAvailableMentions] = useState<MentionItem[]>([])
  const [activeContext, setActiveContext] = useState<ContextItem[]>([])
  const [excelContext, setExcelContext] = useState<any>(null)
  const [isContextEnabled, setIsContextEnabled] = useState(true)
  
  // State for managing selection changes with debouncing
  const [rawSelection, setRawSelection] = useState<string | null>(null)
  const debouncedSelection = useDebounce(rawSelection, 300) // 300ms delay
  
  // Initialize operation queue hook
  const { 
    queue,
    summary,
    approveAllInOrder, 
    dependencies,
    undoStack,
    redoStack,
    updateFromBackendSummary 
  } = useOperationQueue(sessionIdRef.current)
  
  // Autonomy mode state - load from localStorage
  const [autonomyMode, setAutonomyMode] = useState<AutonomyMode>(() => {
    const saved = localStorage.getItem('gridmate-autonomy-mode')
    return (saved as AutonomyMode) || 'agent-default'
  })
  
  // Workbook ID for diff tracking (you might want to get this from context)
  const [workbookId] = useState(() => `workbook_${Date.now()}`)
  
  // Initialize diff preview hook
  const {
    initiatePreview,
    applyChanges: applyDiffChanges,
    cancelPreview,
    isLoading: isDiffLoading,
    error: diffError
  } = useDiffPreview(signalRClient.current, workbookId)
  
  // Helper to add to message log
  const addToLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    console.log(`[${timestamp}] ${message}`)
  }, [])
  
  // Update available mentions based on Excel context
  const updateAvailableMentions = useCallback(async () => {
    addDebugLog('updateAvailableMentions called')
    try {
      const context = await ExcelService.getInstance().getSmartContext()
      addDebugLog(`Excel context received: ${JSON.stringify(context)}`)
      const mentions: MentionItem[] = []
      
      // Add worksheets
      if (context.worksheets) {
        context.worksheets.forEach((sheet: string) => {
          mentions.push({
            id: `sheet-${sheet}`,
            type: 'sheet',
            label: sheet,
            value: `@${sheet}`,
            description: 'Worksheet'
          })
        })
      }
      
      // Add named ranges
      if (context.namedRanges) {
        Object.entries(context.namedRanges).forEach(([name, range]) => {
          mentions.push({
            id: `named-${name}`,
            type: 'namedRange',
            label: name,
            value: `@${name}`,
            description: range as string
          })
        })
      }
      
      // Add tables
      if (context.tables) {
        context.tables.forEach((table: any) => {
          mentions.push({
            id: `table-${table.name}`,
            type: 'table',
            label: table.name,
            value: `@${table.name}`,
            description: `Table (${table.range})`
          })
        })
      }
      
      // Add some common ranges based on current selection
      if (context.selectedRange) {
        const sheet = context.worksheet || 'Sheet1'
        // Extract column letter from range like "A1" or "B3:D5"
        const rangeMatch = context.selectedRange.match(/^([A-Z]+)\d+/)
        if (rangeMatch) {
          const columnLetter = rangeMatch[1]
          mentions.push({
            id: 'selected-column',
            type: 'range',
            label: `${sheet} Column`,
            value: `@${sheet}!${columnLetter}:${columnLetter}`,
            description: 'Entire column of selection'
          })
        }
      }
      
      addDebugLog(`Total mentions created: ${mentions.length}`)
      setAvailableMentions(mentions)
      setExcelContext(context)
      
      // Update active context
      const contextItems: ContextItem[] = []
      if (context.selectedRange) {
        // Check if selectedRange already includes sheet name (e.g., "Sheet1!A1:B2")
        const hasSheetPrefix = context.selectedRange.includes('!')
        const label = hasSheetPrefix 
          ? `Context: ${context.selectedRange}`
          : `Context: ${context.worksheet || 'Sheet'}!${context.selectedRange}`
        
        contextItems.push({
          id: 'selection',
          type: 'selection',
          label: label,
          value: context.selectedRange
        })
        addDebugLog(`Selected range: ${context.selectedRange}`)
      }
      setActiveContext(contextItems)
      addDebugLog(`Active context items: ${contextItems.length}`)
      
    } catch (error) {
      addDebugLog(`Failed to update mentions: ${error}`, 'error')
      console.error('Failed to update mentions:', error)
    }
  }, [addDebugLog, setAvailableMentions, setExcelContext, setActiveContext])
  
  // Handle mention selection
  const handleMentionSelect = (mention: MentionItem) => {
    addDebugLog(`Mention selected: ${mention.value} (type: ${mention.type})`)
    addToLog(`Mention selected: ${mention.value}`)
    
    // Add to active context if it's a persistent reference
    if (['sheet', 'table', 'namedRange'].includes(mention.type)) {
      setActiveContext(prev => {
        // Don't add duplicates
        if (prev.some(item => item.value === mention.value)) {
          addDebugLog(`Mention already in context: ${mention.value}`)
          return prev
        }
        
        addDebugLog(`Adding mention to active context: ${mention.value}`)
        return [...prev, {
          id: mention.id,
          type: mention.type as any,
          label: mention.label,
          value: mention.value,
          removable: true
        }]
      })
    } else {
      addDebugLog(`Mention type ${mention.type} not added to persistent context`)
    }
  }
  
  // Handle context removal
  const handleContextRemove = (id: string) => {
    addDebugLog(`Removing context item: ${id}`)
    setActiveContext(prev => prev.filter(item => item.id !== id))
  }
  
  // Helper to add status message
  const addStatusMessage = (status: StatusMessage['status']) => {
    const statusMessage: StatusMessage = {
      id: `status_${Date.now()}`,
      type: 'status',
      content: '',
      timestamp: new Date(),
      status,
      animated: true
    }
    setMessages(prev => [...prev, statusMessage])
    return statusMessage.id
  }
  
  // Helper to update status message
  const updateStatusMessage = (id: string, status: Partial<StatusMessage['status']>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id && 'type' in msg && msg.type === 'status' 
        ? { ...msg, status: { ...(msg as StatusMessage).status, ...status } } as StatusMessage
        : msg
    ))
  }
  
  // Helper to remove status message
  const removeStatusMessage = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id))
  }
  
  // Handle autonomy mode changes
  const handleAutonomyModeChange = (mode: AutonomyMode) => {
    setAutonomyMode(mode)
    localStorage.setItem('gridmate-autonomy-mode', mode)
    addToLog(`Autonomy mode changed to: ${mode}`)
    
    // Add a system message about the mode change
    const modeDescriptions = {
      'ask': 'Read-only mode activated. AI can analyze but not make changes.',
      'agent-default': 'Default mode activated. AI will suggest changes for your approval.',
      'agent-yolo': '⚡ YOLO mode activated. AI will apply changes automatically!'
    }
    
    const systemMessage: ChatMessage = {
      id: `system_${Date.now()}`,
      role: 'system',
      content: modeDescriptions[mode],
      timestamp: new Date()
    }
    setMessages(prev => [...prev, systemMessage])
  }
  
  // Convert tool request to ToolSuggestionMessage
  const createToolSuggestionMessage = (toolRequest: any): ToolSuggestionMessage => {
    const { tool, request_id, ...input } = toolRequest
    
    return {
      id: `tool_${request_id}`,
      type: 'tool-suggestion',
      content: '',
      timestamp: new Date(),
      responseId: currentResponseId || undefined, // Track which AI response generated this tool
      tool: {
        id: request_id,
        name: tool,
        description: getToolDescription(tool),
        parameters: input,
        estimatedTime: getEstimatedTime(tool),
        riskLevel: checkToolSafety(tool, input).riskLevel as 'low' | 'medium' | 'high'
      },
      actions: {
        approve: () => executeToolRequest(toolRequest),
        reject: () => rejectToolRequest(toolRequest)
      },
      status: 'pending'
    }
  }
  
  const getToolDescription = (toolName: string): string => {
    const descriptions: { [key: string]: string } = {
      'read_range': 'Read data from spreadsheet',
      'write_range': 'Write data to spreadsheet',
      'apply_formula': 'Apply formula to cells',
      'smart_format_cells': 'Format cells',
      'analyze_model_structure': 'Analyze spreadsheet structure',
      'build_financial_formula': 'Build financial formula',
      'create_audit_trail': 'Create audit documentation'
    }
    return descriptions[toolName] || toolName
  }
  
  const getEstimatedTime = (toolName: string): string => {
    const times: { [key: string]: string } = {
      'read_range': '< 1s',
      'write_range': '1-2s',
      'apply_formula': '1-3s',
      'smart_format_cells': '2-5s',
      'analyze_model_structure': '3-5s',
      'build_financial_formula': '2-4s',
      'create_audit_trail': '5-10s'
    }
    return times[toolName] || '1-5s'
  }
  
  // Helper function to identify read-only tools that should be auto-approved
  const isReadOnlyTool = useCallback((toolName: string): boolean => {
    return toolName.startsWith('read_')
  }, [])

  const handleToolRequest = useCallback(async (toolRequest: any) => {
    console.log('🔧 Received tool request:', toolRequest)
    addToLog(`← Received tool_request: ${toolRequest.tool} (${toolRequest.request_id})`)
    
    // Auto-approve read-only tools regardless of autonomy mode
    if (isReadOnlyTool(toolRequest.tool)) {
      addDebugLog(`Auto-approving read-only tool: ${toolRequest.tool}`, 'info')
      
      // Create tool suggestion message with auto-approved status
      const suggestionMessage = createToolSuggestionMessage(toolRequest)
      suggestionMessage.status = 'approved'
      // Add a visual indicator that this was auto-approved
      suggestionMessage.tool.description = (suggestionMessage.tool.description || '') + ' (Auto-approved)'
      setMessages(prev => [...prev, suggestionMessage])
      
      // Execute immediately
      await executeToolRequest(toolRequest)
      return
    }
    
    if (autonomyMode === 'ask') {
      // In Ask mode, immediately reject
      await rejectToolRequest(toolRequest, 'Tool execution not allowed in Ask mode')
      return
    }
    
    if (autonomyMode === 'agent-yolo') {
      // Agent YOLO mode - execute immediately but still show in chat
      const suggestionMessage = createToolSuggestionMessage(toolRequest)
      suggestionMessage.status = 'approved'
      setMessages(prev => [...prev, suggestionMessage])
      
      // Execute immediately
      await executeToolRequest(toolRequest)
      return
    }
    
    // --- NEW LOGIC for 'agent-default' ---
    if (autonomyMode === 'agent-default') {
      // If it's a write tool, add it to the pending diff operations group
      if (WRITE_TOOLS.has(toolRequest.tool)) {
        addDebugLog(`Queueing write tool for diff preview: ${toolRequest.tool}`, 'info');
        const operation: AISuggestedOperation = {
          tool: toolRequest.tool,
          input: { ...toolRequest },
          description: getToolDescription(toolRequest.tool)
        };
        // Use a functional update to ensure we have the latest state
        setPendingDiffOps(prevOps => [...prevOps, operation]);

        // Still add a "pending" message to the UI for user visibility
        const suggestionMessage = createToolSuggestionMessage(toolRequest);
        setMessages(prev => [...prev, suggestionMessage]);

        // Inform the backend that the tool is queued, so it can continue generation
        await signalRClient.current?.send({
            type: 'tool_response',
            data: {
                request_id: toolRequest.request_id,
                result: { status: 'queued_for_preview', message: 'Tool queued for visual diff preview' },
                error: null,
                queued: true
            }
        });

      } else {
        // Handle non-write, non-read-only tools if any exist
        // For now, treat them as standard suggestions and queue them
        addDebugLog(`Queueing non-write tool for approval: ${toolRequest.tool}`, 'info');
        const suggestionMessage = createToolSuggestionMessage(toolRequest);
        setMessages(prev => [...prev, suggestionMessage]);
        
        // Store the tool request for later execution
        toolRequestQueue.current.set(toolRequest.request_id, toolRequest);
        
        // Send a "queued" response so backend can continue
        await signalRClient.current?.send({
          type: 'tool_response',
          data: {
            request_id: toolRequest.request_id,
            result: { status: 'queued', message: 'Tool queued for user approval' },
            error: null,
            queued: true
          }
        });
      }
    }
  }, [autonomyMode, addDebugLog, addToLog, setMessages, toolRequestQueue, signalRClient, isReadOnlyTool, setPendingDiffOps])
  
  const executeToolRequest = useCallback(async (toolRequest: any) => {
    const { tool, request_id, ...input } = toolRequest
    
    console.log('🎯 Executing tool request:', { tool, request_id })
    
    // The decision to use diff preview is now handled upstream in handleToolRequest.
    // This function's role is to execute the tool directly.
    // Update the suggestion message to approved
    setMessages(prev => prev.map(msg => 
      msg.id === `tool_${request_id}` && isToolSuggestion(msg)
        ? { ...msg, status: 'approved' } as ToolSuggestionMessage
        : msg
    ))
    
    // Add executing status with sub-steps
    const statusId = addStatusMessage({
      type: 'executing',
      message: `Executing ${getToolDescription(tool)}...`,
      details: `Request ID: ${request_id}`,
      subSteps: [
        { name: 'Validating parameters', status: 'active' },
        { name: 'Connecting to Excel', status: 'pending' },
        { name: 'Applying changes', status: 'pending' },
        { name: 'Verifying results', status: 'pending' }
      ]
    })
    
    try {
      // Update status: validating complete, connecting to Excel
      updateStatusMessage(statusId, {
        subSteps: [
          { name: 'Validating parameters', status: 'completed', duration: 100 },
          { name: 'Connecting to Excel', status: 'active' },
          { name: 'Applying changes', status: 'pending' },
          { name: 'Verifying results', status: 'pending' }
        ]
      })
      
      const excelService = ExcelService.getInstance()
      const startTime = Date.now()
      
      // Update status: connected, applying changes
      updateStatusMessage(statusId, {
        subSteps: [
          { name: 'Validating parameters', status: 'completed', duration: 100 },
          { name: 'Connecting to Excel', status: 'completed', duration: 200 },
          { name: 'Applying changes', status: 'active' },
          { name: 'Verifying results', status: 'pending' }
        ],
        progress: 50
      })
      
      const result = await excelService.executeToolRequest(tool, input)
      
      // Update status: verifying results
      updateStatusMessage(statusId, {
        subSteps: [
          { name: 'Validating parameters', status: 'completed', duration: 100 },
          { name: 'Connecting to Excel', status: 'completed', duration: 200 },
          { name: 'Applying changes', status: 'completed', duration: Date.now() - startTime - 300 },
          { name: 'Verifying results', status: 'active' }
        ],
        progress: 90
      })
      
      const executionTime = Date.now() - startTime
      
      // Remove status message after brief delay
      setTimeout(() => removeStatusMessage(statusId), 500)
      
      // Add tool result message
      const resultMessage: ToolResultMessage = {
        id: `result_${request_id}`,
        type: 'tool-result',
        content: '',
        timestamp: new Date(),
        tool: {
          id: request_id,
          name: tool
        },
        status: 'success',
        summary: `Successfully executed ${getToolDescription(tool)}`,
        details: {
          executionTime,
          changedCells: result.changedCells || 0
        },
        actions: {
          undo: async () => {
            await signalRClient.current?.send({
              type: 'undoLastOperation',
              data: { sessionId: sessionIdRef.current }
            })
          }
        }
      }
      setMessages(prev => [...prev, resultMessage])
      
      // Log successful execution
      AuditLogger.logToolExecution({
        timestamp: new Date(),
        toolName: tool,
        parameters: input,
        autonomyMode: autonomyMode,
        result: 'success',
        sessionId: sessionIdRef.current
      })
      
      // Send response back via SignalR
      await signalRClient.current?.send({
        type: 'tool_response',
        data: {
          request_id: request_id,
          result: result,
          error: null
        }
      })
      
    } catch (error) {
      console.error('❌ Tool execution failed:', error)
      const errorMessage = (error as Error).message
      
      // Update status to show error
      updateStatusMessage(statusId, {
        type: 'error',
        message: 'Tool execution failed',
        details: errorMessage,
        subSteps: [
          { name: 'Validating parameters', status: 'completed', duration: 100 },
          { name: 'Connecting to Excel', status: 'completed', duration: 200 },
          { name: 'Applying changes', status: 'failed' },
          { name: 'Verifying results', status: 'pending' }
        ]
      })
      
      // Remove status message after delay
      setTimeout(() => removeStatusMessage(statusId), 2000)
      
      // Add error result message
      const resultMessage: ToolResultMessage = {
        id: `result_${request_id}`,
        type: 'tool-result',
        content: '',
        timestamp: new Date(),
        tool: {
          id: request_id,
          name: tool
        },
        status: 'failed',
        summary: `Failed to execute ${getToolDescription(tool)}`,
        details: {
          error: errorMessage
        },
        actions: {
          retry: () => executeToolRequest(toolRequest)
        }
      }
      setMessages(prev => [...prev, resultMessage])
      
      // Log failed execution
      AuditLogger.logToolExecution({
        timestamp: new Date(),
        toolName: tool,
        parameters: input,
        autonomyMode: autonomyMode,
        result: 'failure',
        error: errorMessage,
        sessionId: sessionIdRef.current
      })
      
      // Send error response
      await signalRClient.current?.send({
        type: 'tool_response',
        data: {
          request_id: request_id,
          result: null,
          error: errorMessage
        }
      })
    }
    
    // Remove from queue
    toolRequestQueue.current.delete(request_id)
  }, [setMessages, isToolSuggestion, addStatusMessage, getToolDescription, updateStatusMessage, removeStatusMessage, sessionIdRef, signalRClient, toolRequestQueue])
  
  const rejectToolRequest = useCallback(async (toolRequest: any, reason?: string) => {
    const { request_id } = toolRequest
    
    // Update the suggestion message to rejected
    setMessages(prev => prev.map(msg => 
      msg.id === `tool_${request_id}` && isToolSuggestion(msg)
        ? { ...msg, status: 'rejected' } as ToolSuggestionMessage
        : msg
    ))
    
    // Send rejection response
    await signalRClient.current?.send({
      type: 'tool_response',
      data: {
        request_id: request_id,
        result: null,
        error: reason || 'Tool execution rejected by user'
      }
    })
    
    // Remove from queue
    toolRequestQueue.current.delete(request_id)
  }, [setMessages, isToolSuggestion, signalRClient, toolRequestQueue])
  
  // Create a ref to hold the stable handleToolRequest callback
  const handleToolRequestRef = useRef(handleToolRequest)
  
  // Update the ref whenever handleToolRequest changes
  useEffect(() => {
    handleToolRequestRef.current = handleToolRequest
  }, [handleToolRequest])
  
  // Handle bulk approval/rejection for ALL pending tools
  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (isProcessingBulkAction) return
    
    addDebugLog(`Bulk ${action} for all pending tools`, 'info')
    setIsProcessingBulkAction(true)
    
    // Find ALL pending tools
    const pendingTools = messages.filter(msg => 
      isToolSuggestion(msg) && 
      msg.status === 'pending'
    ) as ToolSuggestionMessage[]
    
    addDebugLog(`Found ${pendingTools.length} pending tools to ${action}`, 'info')
    
    // Execute actions in order
    for (const tool of pendingTools) {
      try {
        if (action === 'approve') {
          await tool.actions.approve()
        } else {
          await tool.actions.reject()
        }
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        addDebugLog(`Failed to ${action} tool ${tool.tool.name}: ${error}`, 'error')
      }
    }
    
    setIsProcessingBulkAction(false)
    addDebugLog(`Bulk ${action} completed`, 'success')
  }

  const handleAIResponse = useCallback(async (response: any) => {
    console.log('🤖 Handling AI response:', response)
    
    // Remove any thinking/generating status messages
    setMessages(prev => prev.filter(msg => 
      !(msg.type === 'status' && ['thinking', 'generating'].includes((msg as StatusMessage).status.type))
    ))
    
    const aiMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: response.content || response.message || 'I received your message.',
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, aiMessage])
    setIsLoading(false)
    setAiIsGenerating(false)
    
    // --- NEW LOGIC ---
    // Check if there are pending diff operations to preview
    if (pendingDiffOps.length > 0) {
      addDebugLog(`AI response finished. Initiating diff preview for ${pendingDiffOps.length} operations.`, 'info');
      addDebugLog(`SignalR client status: ${signalRClient.current ? 'available' : 'null'}`, 'info');
      addDebugLog(`Operations: ${JSON.stringify(pendingDiffOps.map(op => ({ tool: op.tool, hasInput: !!op.input })))}`, 'info');
      try {
        addDebugLog(`About to call initiatePreview with ${pendingDiffOps.length} operations`, 'info');
        await initiatePreview(pendingDiffOps);
        addDebugLog(`Successfully called initiatePreview`, 'success');
        
        // Check if visual diff logs are being created
        const currentVisualDiffLogs = useLogStore.getState().logs.filter((log: any) => log.source === 'visual-diff');
        addDebugLog(`Visual diff logs after initiatePreview: ${currentVisualDiffLogs.length} entries`, 'info');
      } catch (error) {
        addDebugLog(`Error calling initiatePreview: ${error}`, 'error');
        console.error('initiatePreview error:', error);
      }
      // Clear the pending operations now that they've been passed to the hook
      setPendingDiffOps([]);
    }
    
    // Check if there are pending tools from this response (non-write tools)
    if (currentResponseId) {
      const hasPendingTools = messages.some(msg => 
        isToolSuggestion(msg) && 
        msg.responseId === currentResponseId && 
        msg.status === 'pending'
      )
      
      if (hasPendingTools) {
        setShowPendingToolsBar(true)
        addDebugLog(`AI response completed with pending tools. Showing bulk action bar.`, 'info')
      }
      
      // Don't clear currentResponseId yet - we need it for bulk actions
    }
  }, [setMessages, setIsLoading, setAiIsGenerating, pendingDiffOps, currentResponseId, messages, setShowPendingToolsBar, addDebugLog, initiatePreview, setPendingDiffOps, isToolSuggestion])
  
  // Create a ref to hold the stable handleAIResponse callback
  const handleAIResponseRef = useRef(handleAIResponse)
  
  // Update the ref whenever handleAIResponse changes
  useEffect(() => {
    handleAIResponseRef.current = handleAIResponse
  }, [handleAIResponse])
  
  const handleSendMessage = async (content?: string) => {
    const messageContent = content || input
    addDebugLog(`handleSendMessage called with: "${messageContent}"`)
    
    if (!messageContent.trim()) {
      addDebugLog('Message is empty, returning', 'warning')
      return
    }
    
    // Clear any pending diff operations from previous interactions
    if (pendingDiffOps.length > 0) {
      addDebugLog(`Clearing ${pendingDiffOps.length} pending diff operations from previous interaction`, 'info');
      setPendingDiffOps([]);
    }
    
    // Check SignalR client existence
    if (!signalRClient.current) {
      addDebugLog('SignalR client is null!', 'error')
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'system',
        content: '❌ SignalR client not initialized. Please refresh the page.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      return
    }
    
    // Check connection status
    const isConnected = signalRClient.current.isConnected()
    addDebugLog(`SignalR isConnected: ${isConnected}`)
    addDebugLog(`Connection status: ${connectionStatus}`)
    addDebugLog(`Is authenticated: ${isAuthenticated}`)
    
    if (!isConnected) {
      addDebugLog('Not connected to SignalR, attempting to reconnect', 'warning')
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'system',
        content: '⚠️ Not connected to server. Please wait for connection to be established...',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      
      // Try to reconnect
      if (signalRClient.current) {
        addDebugLog('Attempting to reconnect...', 'info')
        signalRClient.current.connect('dev-token-123').catch(error => {
          addDebugLog(`Failed to reconnect: ${error}`, 'error')
        })
      }
      
      return
    }
    
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setAiIsGenerating(true)
    
    // Clear any previous response tracking and start new one
    setCurrentResponseId(null) // Clear previous
    const responseId = `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setCurrentResponseId(responseId)
    addDebugLog(`Started new AI response: ${responseId}`, 'info')
    
    addDebugLog('User message added to UI, sending to backend...')
    
    
    try {
      // Get Excel context
      let excelContext = null
      try {
        addDebugLog('Getting Excel context for message...')
        const comprehensiveContext = await ExcelService.getInstance().getSmartContext()
        addDebugLog(`Raw Excel context: ${JSON.stringify(comprehensiveContext)}`)
        excelContext = {
          worksheet: comprehensiveContext.worksheet || 'Sheet1',
          workbook: comprehensiveContext.workbook || 'Workbook',
          selectedRange: comprehensiveContext.selectedRange?.address || 'A1'
        }
        addDebugLog(`Processed Excel context: ${JSON.stringify(excelContext)}`)
      } catch (error) {
        addDebugLog(`Could not get Excel context: ${error}`, 'error')
        console.warn('Could not get Excel context:', error)
      }
      
      // Parse mentions from the message
      const mentionedRanges = messageContent.match(/@(\w+)/g) || []
      addDebugLog(`Mentions found in message: ${mentionedRanges.length > 0 ? mentionedRanges.join(', ') : 'none'}`)
      
      // Send message with enhanced context
      const messagePayload = {
        type: 'chat_message',
        data: {
          content: messageContent,
          sessionId: sessionIdRef.current,
          excelContext: isContextEnabled ? {
            ...excelContext,
            mentionedRanges,
            activeContext: activeContext.map(c => ({ type: c.type, value: c.value }))
          } : null,
          autonomyMode: autonomyMode
        }
      }
      
      addDebugLog(`Sending message payload: ${JSON.stringify(messagePayload)}`)
      
      await signalRClient.current.send(messagePayload)
      
      addDebugLog('Message sent successfully', 'success')
      
    } catch (error) {
      addDebugLog(`Failed to send message: ${error}`, 'error')
      console.error('Failed to send message:', error)
      setIsLoading(false)
      setAiIsGenerating(false)
      
    }
  }
  
  const handleMessageAction = (messageId: string, action: string) => {
    const message = messages.find(m => m.id === messageId)
    
    if (message && isToolSuggestion(message)) {
      switch (action) {
        case 'approve':
          message.actions.approve()
          break
        case 'reject':
          message.actions.reject()
          break
        case 'modify':
          message.actions.modify?.()
          break
      }
    } else if (message && isBatchOperation(message)) {
      switch (action) {
        case 'approve':
          message.actions.approveAll()
          break
        case 'reject':
          message.actions.rejectAll()
          break
      }
    }
  }
  
  // Handle undo
  const handleUndo = async () => {
    if (signalRClient.current) {
      await signalRClient.current.send({
        type: 'undoLastOperation',
        data: { sessionId: sessionIdRef.current }
      })
    }
  }
  
  // Handle redo
  const handleRedo = async () => {
    if (signalRClient.current) {
      await signalRClient.current.send({
        type: 'redoLastOperation',
        data: { sessionId: sessionIdRef.current }
      })
    }
  }
  
  // Handle clear chat
  const handleClearChat = () => {
    setMessages([])
    // Add a system message
    const clearMessage: ChatMessage = {
      id: `system_${Date.now()}`,
      role: 'system',
      content: 'Chat history cleared.',
      timestamp: new Date()
    }
    setMessages([clearMessage])
  }
  
  // Keyboard shortcut for mode switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+. or Ctrl+. to cycle through modes
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault()
        const modes: AutonomyMode[] = ['ask', 'agent-default', 'agent-yolo']
        const currentIndex = modes.indexOf(autonomyMode)
        const nextIndex = (currentIndex + 1) % modes.length
        handleAutonomyModeChange(modes[nextIndex])
        
        // Visual feedback with a brief flash effect
        const flashElement = document.createElement('div')
        flashElement.className = 'fixed inset-0 bg-blue-500 opacity-0 pointer-events-none z-50'
        flashElement.style.transition = 'opacity 150ms'
        document.body.appendChild(flashElement)
        
        // Trigger flash
        requestAnimationFrame(() => {
          flashElement.style.opacity = '0.1'
          setTimeout(() => {
            flashElement.style.opacity = '0'
            setTimeout(() => flashElement.remove(), 150)
          }, 150)
        })
      }
      
      // Show keyboard shortcuts help with Cmd+/
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        const helpMessage: StatusMessage = {
          id: `help_${Date.now()}`,
          type: 'status',
          content: '',
          timestamp: new Date(),
          status: {
            type: 'info',
            message: 'Keyboard Shortcuts',
            details: `${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+. : Switch autonomy mode
${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+L : Focus chat input
Enter : Approve focused action
Escape : Reject focused action
↑/↓ : Navigate between actions`
          },
          animated: false
        }
        setMessages(prev => [...prev, helpMessage])
        setTimeout(() => removeStatusMessage(helpMessage.id), 5000)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [autonomyMode])
  
  // Update mentions when component mounts and listen for selection changes
  useEffect(() => {
    addDebugLog('Initializing mention system and selection change listener...')
    updateAvailableMentions()
    
    // Set up real-time selection change listener
    const setupSelectionListener = async () => {
      try {
        await Excel.run(async (context) => {
          // Register event handler for selection changes
          const worksheet = context.workbook.worksheets.getActiveWorksheet()
          worksheet.onSelectionChanged.add((args) => {
            addDebugLog('Selection changed, updating context...')
            // Just update the raw selection state - debouncing will handle the rest
            setRawSelection(`selection_${Date.now()}`)
          })
          
          await context.sync()
          addDebugLog('Selection change listener registered successfully')
        })
      } catch (error) {
        addDebugLog(`Failed to set up selection listener: ${error}`, 'error')
        console.error('Failed to set up selection listener:', error)
        
        // Fallback to periodic updates if event registration fails
        const interval = setInterval(() => {
          addDebugLog('Fallback periodic mention refresh (30s)')
          updateAvailableMentions()
        }, 30000)
        
        return () => clearInterval(interval)
      }
    }
    
    // Only set up listener if we're in Office context
    if (typeof Office !== 'undefined' && Office.context) {
      addDebugLog('Office context found, registering document selection handler...')
      Office.context.document.addHandlerAsync(
        Office.EventType.DocumentSelectionChanged,
        () => {
          addDebugLog('Document selection changed event fired!')
          // Just update the raw selection state - debouncing will handle the rest
          setRawSelection(`selection_${Date.now()}`)
        },
        (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            addDebugLog('Document selection change handler registered successfully', 'success')
          } else {
            addDebugLog(`Failed to register selection handler: ${result.error?.message}`, 'error')
            setupSelectionListener() // Try Excel-specific approach
          }
        }
      )
    } else {
      addDebugLog('No Office context, trying Excel-specific approach...')
      setupSelectionListener() // Try Excel-specific approach
    }
    
    return () => {
      addDebugLog('Cleaning up selection listeners')
      // Note: Office.js doesn't provide a direct way to remove event handlers
      // They are cleaned up when the add-in is unloaded
    }
  }, [addDebugLog, updateAvailableMentions])
  
  // Handle debounced selection changes
  useEffect(() => {
    // Only update mentions when the debounced selection value changes
    if (debouncedSelection) {
      addDebugLog('Debounced selection changed, updating mentions...')
      updateAvailableMentions()
    }
  }, [debouncedSelection, updateAvailableMentions, addDebugLog])
  
  // Initialize SignalR connection
  useEffect(() => {
    addDebugLog('SignalR useEffect triggered')
    
    if (globalSignalRClient && globalSignalRClient.isConnected()) {
      addDebugLog('Using existing global SignalR client', 'info')
      signalRClient.current = globalSignalRClient
      setConnectionStatus('connected')
      // Check if already authenticated
      if (sessionIdRef.current && sessionIdRef.current !== `session_${Date.now()}`) {
        setIsAuthenticated(true)
        addDebugLog('Already authenticated with existing session', 'success')
      }
      return
    }
    
    if (signalRClient.current || globalSignalRClient) {
      addDebugLog('SignalR client already exists, skipping initialization', 'warning')
      return
    }
    
    addDebugLog('Initializing new SignalR connection...', 'info')
    
    const signalRUrl = window.location.protocol === 'https:' 
      ? `${window.location.protocol}//${window.location.host}/signalr/hub`
      : 'http://localhost:5000/hub'
    
    addDebugLog(`SignalR URL: ${signalRUrl}`)
    
    const newClient = new SignalRClient(signalRUrl)
    signalRClient.current = newClient
    globalSignalRClient = newClient
    
    addDebugLog('SignalR client created, setting up event handlers...')
    
    // Set up event handlers
    signalRClient.current.on('connected', () => {
      addDebugLog('SignalR connected event received', 'success')
      setConnectionStatus('connected')
    })
    
    signalRClient.current.on('disconnected', () => {
      addDebugLog('SignalR disconnected event received', 'error')
      setConnectionStatus('disconnected')
    })
    
    signalRClient.current.on('message', (data: any) => {
      addDebugLog(`Received message: ${data.type}`)
      console.log('📨 Received message:', data)
      
      if (data.type === 'auth_success') {
        sessionIdRef.current = data.data.sessionId || sessionIdRef.current
        setIsAuthenticated(true)
        addDebugLog(`Authentication successful, session: ${sessionIdRef.current}`, 'success')
        
        // Join workbook group for diff broadcasts
        if (signalRClient.current && workbookId) {
          signalRClient.current.invoke('JoinWorkbookGroup', workbookId)
            .then(() => addDebugLog(`Joined workbook group: ${workbookId}`, 'success'))
            .catch(err => addDebugLog(`Failed to join workbook group: ${err}`, 'error'))
        }
      }
      
      if (data.type === 'tool_request') {
        handleToolRequestRef.current(data.data)
      }
      
      if (data.type === 'ai_response') {
        handleAIResponseRef.current(data.data)
      }
      
      if (data.type === 'pending_operations') {
        updateFromBackendSummary(data.data)
      }
    })
    
    signalRClient.current.on('error', (error: any) => {
      console.error('❌ SignalR error:', error)
    })
    
    // Connect
    addDebugLog('Attempting to connect to SignalR...')
    signalRClient.current.connect('dev-token-123')
      .then(() => {
        addDebugLog('SignalR connect() promise resolved', 'success')
      })
      .catch(error => {
        addDebugLog(`Failed to connect: ${error}`, 'error')
        console.error('Failed to connect:', error)
      })
    
    return () => {
      if (signalRClient.current === globalSignalRClient) {
        console.log('⚠️ Component unmounting but keeping global SignalR connection alive')
      }
    }
  }, [addDebugLog])
  
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--app-background)' }}>
      {/* Connection Status Bar */}
      {(connectionStatus !== 'connected' || !isAuthenticated) && (
        <div className={`px-4 py-2 text-sm font-medium ${
          connectionStatus === 'connecting' ? 'bg-yellow-600 text-white' : 
          connectionStatus === 'disconnected' ? 'bg-red-600 text-white' :
          !isAuthenticated ? 'bg-orange-600 text-white' : ''
        }`}>
          {connectionStatus === 'connecting' 
            ? '🔄 Connecting to server...' 
            : connectionStatus === 'disconnected'
            ? '❌ Disconnected from server. Attempting to reconnect...'
            : !isAuthenticated
            ? '🔐 Authenticating...'
            : ''}
        </div>
      )}
      
      {/* Scrollable chat container */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <EnhancedChatInterface
        messages={messages}
        input={input}
        setInput={setInput}
        handleSendMessage={handleSendMessage}
        isLoading={isLoading}
        autonomySelector={
          <EnhancedAutonomySelector
            currentMode={autonomyMode}
            onModeChange={handleAutonomyModeChange}
          />
        }
        onMessageAction={handleMessageAction}
        availableMentions={availableMentions}
        activeContext={activeContext}
        onContextRemove={handleContextRemove}
        // Bulk actions
        pendingToolsCount={pendingToolsCount}
        onApproveAll={() => handleBulkAction('approve')}
        onRejectAll={() => handleBulkAction('reject')}
        isProcessingBulkAction={isProcessingBulkAction}
        aiIsGenerating={aiIsGenerating}
        onMentionSelect={handleMentionSelect}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClearChat={handleClearChat}
        hasUndo={undoStack.length > 0}
        hasRedo={redoStack.length > 0}
        isContextEnabled={isContextEnabled}
        onContextToggle={() => setIsContextEnabled(!isContextEnabled)}
        />
      </div>
      
      {/* Debug Info (collapsed by default) */}
      <details 
        data-debug="true" 
        open={isDebugOpen}
        style={{ 
          borderTop: '1px solid #374151', 
          backgroundColor: '#1f2937',
          fontSize: '11px',
          padding: '8px 12px',
          color: '#e5e7eb',
          userSelect: 'text',
          WebkitUserSelect: 'text',
          MozUserSelect: 'text',
          msUserSelect: 'text'
        }}
      >
        <summary 
          style={{ 
            cursor: 'pointer', 
            fontWeight: 'medium', 
            color: '#e5e7eb',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
          onClick={(e) => {
            e.preventDefault()
            setIsDebugOpen(!isDebugOpen)
          }}
        >
          <span>Debug Info</span>
        </summary>
        <div style={{ 
          marginTop: '8px', 
          fontFamily: 'monospace',
          userSelect: 'text',
          WebkitUserSelect: 'text',
          MozUserSelect: 'text',
          msUserSelect: 'text'
        }}>
          <div>Session: {sessionIdRef.current}</div>
          <div>Mode: {autonomyMode}</div>
          <div>Connection: {connectionStatus} {isAuthenticated ? '(authenticated)' : '(not authenticated)'}</div>
          <div>SignalR Connected: {signalRClient.current?.isConnected() ? 'Yes' : 'No'}</div>
          
          {/* Copy All Debug Info Button */}
          <button
            onClick={async () => {
              console.log('🔵 Copy All Debug Info button clicked!');
              
              // Show immediate feedback
              setCopyButtonText('⏳ Copying...');
              
              try {
                // Defensive checks for allLogs
                const safeAllLogs = Array.isArray(allLogs) ? allLogs : [];
                const safeVisualDiffLogs = Array.isArray(visualDiffLogs) ? visualDiffLogs : [];
                
                console.log('📊 Log arrays:', { 
                  allLogsLength: safeAllLogs.length, 
                  visualDiffLogsLength: safeVisualDiffLogs.length,
                  allLogsType: typeof allLogs,
                  isArray: Array.isArray(allLogs)
                });
                
                // Generate the full debug string including visual diff logs
                let debugInfo = '';
                try {
                  // Safely get all the logs
                  const generalLogs = safeAllLogs.filter(l => l && l.source === 'general').map(log => `[${log.timestamp}] ${log.message}`).join('\n');
                  const diffLogs = safeVisualDiffLogs.map(log => log ? `[${log.timestamp}] ${log.message}` : '').join('\n');
                  
                  // Safely get audit logs
                  let auditLogsText = 'No audit logs available';
                  try {
                    const auditLogs = AuditLogger.getRecentLogs(10).reverse();
                    if (auditLogs && auditLogs.length > 0) {
                      auditLogsText = auditLogs.map(log => 
                        `${new Date(log.timestamp).toLocaleTimeString()} - ${log.toolName} - ${log.result} ${log.autonomyMode ? `(${log.autonomyMode})` : ''}${log.error ? ` - Error: ${log.error}` : ''}`
                      ).join('\n');
                    }
                  } catch (auditError) {
                    console.error('Error getting audit logs:', auditError);
                    auditLogsText = `Error retrieving audit logs: ${auditError}`;
                  }
                  
                  // Safely get queue summary
                  let queueSummaryText = '';
                  let queueItemsText = '';
                  try {
                    if (summary) {
                      queueSummaryText = `Pending: ${summary.pendingCount || 0}
Completed: ${summary.completedCount || 0}
Failed: ${summary.failedCount || 0}
In Progress: ${summary.inProgressCount || 0}`;
                    } else {
                      queueSummaryText = 'Queue summary not available';
                    }
                    
                    if (queue && queue.length > 0) {
                      queueItemsText = `\nQueue Items:\n${queue.map((op, i) => `${i + 1}. [${op.status}] ${op.toolName} - ${op.description}`).join('\n')}`;
                    }
                  } catch (queueError) {
                    console.error('Error getting queue info:', queueError);
                    queueSummaryText = 'Queue information not available';
                  }
                  
                  // Safely get debug logs
                  let debugLogsText = 'No debug logs';
                  try {
                    if (debugLogs && debugLogs.length > 0) {
                      debugLogsText = debugLogs.map(log => `[${log.time}] [${log.type.toUpperCase()}] ${log.message}`).join('\n');
                    }
                  } catch (debugLogError) {
                    console.error('Error getting debug logs:', debugLogError);
                    debugLogsText = 'Error retrieving debug logs';
                  }
                  
                  debugInfo = `Debug Info - ${new Date().toISOString()}
=====================================

=== Connection Info ===
Session: ${sessionIdRef.current || 'No session'}
Mode: ${autonomyMode || 'Unknown'}
Connection: ${connectionStatus || 'Unknown'} ${isAuthenticated ? '(authenticated)' : '(not authenticated)'}
SignalR Connected: ${signalRClient.current?.isConnected ? signalRClient.current.isConnected() : 'No client'} 

=== Debug Logs (${debugLogs?.length || 0} entries) ===
${debugLogsText}

=== Visual Diff Logs (${safeVisualDiffLogs.length} entries) ===
${diffLogs || 'No visual diff activity yet...'}

=== General Logs (${safeAllLogs.filter(l => l && l.source === 'general').length} entries) ===
${generalLogs || 'No general logs'}

=== Audit Logs (last 10) ===
${auditLogsText}

=== Queue Summary ===
${queueSummaryText}${queueItemsText}

=== Raw Data ===
All Logs Count: ${safeAllLogs.length}
Visual Diff Logs Count: ${safeVisualDiffLogs.length}
Debug Logs Count: ${debugLogs?.length || 0}`;
                  
                  console.log('✅ Debug info generated successfully, length:', debugInfo.length);
                } catch (genError) {
                  console.error('❌ Error generating debug info:', genError);
                  // More comprehensive fallback
                  debugInfo = `Error generating debug info: ${genError}

=== Basic Info ===
Session: ${sessionIdRef.current || 'No session'}
Mode: ${autonomyMode || 'Unknown'}
Connection: ${connectionStatus || 'Unknown'}
Authenticated: ${isAuthenticated}
SignalR Client Exists: ${!!signalRClient.current}

=== Available Data ===
allLogs exists: ${!!allLogs}
allLogs is array: ${Array.isArray(allLogs)}
allLogs length: ${Array.isArray(allLogs) ? allLogs.length : 'N/A'}
visualDiffLogs exists: ${!!visualDiffLogs}
debugLogs exists: ${!!debugLogs}
debugLogs length: ${Array.isArray(debugLogs) ? debugLogs.length : 'N/A'}
summary exists: ${!!summary}
queue exists: ${!!queue}

Please check the browser console for more details.`;
                }

                // Try multiple clipboard methods
                let copySuccess = false;
                
                // Method 1: Try modern clipboard API first
                console.log('🔧 Trying modern clipboard API...');
                try {
                  await navigator.clipboard.writeText(debugInfo);
                  copySuccess = true;
                  console.log('✅ Modern clipboard API succeeded!');
                } catch (err) {
                  console.log("⚠️ Modern clipboard API failed:", err);
                }
                
                // Method 2: Try document.execCommand (older but more compatible)
                if (!copySuccess) {
                  console.log('🔧 Trying document.execCommand...');
                  try {
                    // Create a temporary textarea
                    const tempTextArea = document.createElement('textarea');
                    tempTextArea.value = debugInfo;
                    tempTextArea.style.position = 'fixed';
                    tempTextArea.style.top = '0';
                    tempTextArea.style.left = '0';
                    tempTextArea.style.width = '2em';
                    tempTextArea.style.height = '2em';
                    tempTextArea.style.padding = '0';
                    tempTextArea.style.border = 'none';
                    tempTextArea.style.outline = 'none';
                    tempTextArea.style.boxShadow = 'none';
                    tempTextArea.style.background = 'transparent';
                    document.body.appendChild(tempTextArea);
                    
                    // Focus and select
                    tempTextArea.focus();
                    tempTextArea.select();
                    tempTextArea.setSelectionRange(0, debugInfo.length);
                    
                    // Try to copy
                    copySuccess = document.execCommand('copy');
                    console.log('✅ execCommand result:', copySuccess);
                    
                    // Cleanup
                    document.body.removeChild(tempTextArea);
                  } catch (err) {
                    console.error("❌ execCommand fallback failed:", err);
                  }
                }
                
                // Method 3: Try Office.js clipboard if available (with Promise wrapper)
                if (!copySuccess && typeof Office !== 'undefined' && Office.context && Office.context.document) {
                  console.log('🔧 Trying Office.js clipboard...');
                  try {
                    copySuccess = await new Promise((resolve) => {
                      Office.context.document.setSelectedDataAsync(
                        debugInfo,
                        { coercionType: Office.CoercionType.Text },
                        (result) => {
                          if (result.status === Office.AsyncResultStatus.Succeeded) {
                            console.log('✅ Office.js clipboard succeeded!');
                            resolve(true);
                          } else {
                            console.log('❌ Office.js clipboard failed:', result.error);
                            resolve(false);
                          }
                        }
                      );
                    });
                  } catch (err) {
                    console.error("❌ Office.js clipboard failed:", err);
                  }
                }
                
                // Update UI based on result
                if (copySuccess) {
                  addDebugLog('Debug info copied to clipboard', 'success');
                  setCopyButtonText('✅ Copied!');
                  setShowDebugText(false); // Hide textarea if shown
                  console.log('🎉 Copy successful!');
                } else {
                  addDebugLog('All copy methods failed, showing manual copy option', 'warning');
                  setCopyButtonText('❌ Manual Copy Required');
                  setShowDebugText(true); // Show the textarea on failure
                  console.log('😞 All copy methods failed, showing manual option');
                }
                
              } catch (error) {
                console.error('❌ Fatal error in copy handler:', error);
                setCopyButtonText('❌ Error - See Console');
                setShowDebugText(true);
                // Show an alert as last resort to confirm button works
                alert(`Copy button error: ${error}. Please check console and use manual copy.`);
              } finally {
                // Always reset button text after delay
                setTimeout(() => setCopyButtonText('📋 Copy All Debug Info'), 3000);
              }
            }}
            style={{
              marginTop: '8px',
              padding: '4px 8px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            {copyButtonText}
          </button>
          
          {/* Fallback Textarea */}
          {showDebugText && (
            <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#1e293b', borderRadius: '4px', border: '1px solid #334155' }}>
              <p style={{ fontSize: '11px', color: '#fbbf24', marginBottom: '8px', fontWeight: 'bold' }}>
                ⚠️ Automatic copy failed. Manual copy options:
              </p>
              <div style={{ marginBottom: '8px' }}>
                <button
                  onClick={() => {
                    const textarea = document.getElementById('debug-info-textarea') as HTMLTextAreaElement;
                    if (textarea) {
                      textarea.select();
                      textarea.setSelectionRange(0, textarea.value.length);
                      try {
                        document.execCommand('copy');
                        addDebugLog('Debug info selected and copied', 'success');
                        setCopyButtonText('✅ Manually Copied!');
                        setTimeout(() => {
                          setCopyButtonText('📋 Copy All Debug Info');
                          setShowDebugText(false);
                        }, 2000);
                      } catch (err) {
                        addDebugLog('Manual copy also failed', 'error');
                        alert('Please select all text (Ctrl+A/Cmd+A) and copy (Ctrl+C/Cmd+C)');
                      }
                    }
                  }}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    marginRight: '8px'
                  }}
                >
                  🔄 Try Manual Copy
                </button>
                <button
                  onClick={() => {
                    const textarea = document.getElementById('debug-info-textarea') as HTMLTextAreaElement;
                    if (textarea) {
                      textarea.select();
                      textarea.setSelectionRange(0, textarea.value.length);
                      textarea.focus();
                    }
                  }}
                  style={{
                    padding: '4px 12px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  📝 Select All Text
                </button>
              </div>
              <textarea
                id="debug-info-textarea"
                readOnly
                value={(() => {
                  try {
                    // Safely get all logs
                    const safeAllLogs = Array.isArray(allLogs) ? allLogs : [];
                    const safeVisualDiffLogs = Array.isArray(visualDiffLogs) ? visualDiffLogs : [];
                    
                    const generalLogs = safeAllLogs.filter(l => l && l.source === 'general').map(log => `[${log.timestamp}] ${log.message}`).join('\n');
                    const diffLogs = safeVisualDiffLogs.map(log => log ? `[${log.timestamp}] ${log.message}` : '').join('\n');
                    
                    // Safely get audit logs
                    let auditLogsText = 'No audit logs available';
                    try {
                      const auditLogs = AuditLogger.getRecentLogs(10).reverse();
                      if (auditLogs && auditLogs.length > 0) {
                        auditLogsText = auditLogs.map(log => 
                          `${new Date(log.timestamp).toLocaleTimeString()} - ${log.toolName} - ${log.result} ${log.autonomyMode ? `(${log.autonomyMode})` : ''}${log.error ? ` - Error: ${log.error}` : ''}`
                        ).join('\n');
                      }
                    } catch (auditError) {
                      auditLogsText = `Error retrieving audit logs: ${auditError}`;
                    }
                    
                    // Safely get queue summary
                    let queueSummaryText = '';
                    let queueItemsText = '';
                    try {
                      if (summary) {
                        queueSummaryText = `Pending: ${summary.pendingCount || 0}
Completed: ${summary.completedCount || 0}
Failed: ${summary.failedCount || 0}
In Progress: ${summary.inProgressCount || 0}`;
                      } else {
                        queueSummaryText = 'Queue summary not available';
                      }
                      
                      if (queue && queue.length > 0) {
                        queueItemsText = `\nQueue Items:\n${queue.map((op, i) => `${i + 1}. [${op.status}] ${op.toolName} - ${op.description}`).join('\n')}`;
                      }
                    } catch (queueError) {
                      queueSummaryText = 'Queue information not available';
                    }
                    
                    // Safely get debug logs
                    let debugLogsText = 'No debug logs';
                    try {
                      if (debugLogs && debugLogs.length > 0) {
                        debugLogsText = debugLogs.map(log => `[${log.time}] [${log.type.toUpperCase()}] ${log.message}`).join('\n');
                      }
                    } catch (debugLogError) {
                      debugLogsText = 'Error retrieving debug logs';
                    }
                    
                    return `Debug Info - ${new Date().toISOString()}
=====================================

=== Connection Info ===
Session: ${sessionIdRef.current || 'No session'}
Mode: ${autonomyMode || 'Unknown'}
Connection: ${connectionStatus || 'Unknown'} ${isAuthenticated ? '(authenticated)' : '(not authenticated)'}
SignalR Connected: ${signalRClient.current?.isConnected ? signalRClient.current.isConnected() : 'No client'} 

=== Debug Logs (${debugLogs?.length || 0} entries) ===
${debugLogsText}

=== Visual Diff Logs (${safeVisualDiffLogs.length} entries) ===
${diffLogs || 'No visual diff activity yet...'}

=== General Logs (${safeAllLogs.filter(l => l && l.source === 'general').length} entries) ===
${generalLogs || 'No general logs'}

=== Audit Logs (last 10) ===
${auditLogsText}

=== Queue Summary ===
${queueSummaryText}${queueItemsText}

=== Raw Data ===
All Logs Count: ${safeAllLogs.length}
Visual Diff Logs Count: ${safeVisualDiffLogs.length}
Debug Logs Count: ${debugLogs?.length || 0}`;
                  } catch (error) {
                    return `Error generating debug info in textarea: ${error}

=== Basic Info ===
Session: ${sessionIdRef.current || 'No session'}
Mode: ${autonomyMode || 'Unknown'}
Connection: ${connectionStatus || 'Unknown'}
Authenticated: ${isAuthenticated}

Please try the copy button again or check console for details.`;
                  }
                })()}
                style={{
                  width: '100%',
                  height: '200px',
                  marginTop: '4px',
                  backgroundColor: '#0d1117',
                  color: '#e5e7eb',
                  border: '1px solid #30363d',
                  fontSize: '10px',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  padding: '8px',
                  borderRadius: '4px',
                  resize: 'vertical',
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                  MozUserSelect: 'text',
                  msUserSelect: 'text'
                }}
                onFocus={(e) => {
                  e.target.select();
                  e.target.setSelectionRange(0, e.target.value.length);
                }}
                onClick={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.select();
                  target.setSelectionRange(0, target.value.length);
                }}
              />
              <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                💡 Tip: Click the textarea or use Ctrl+A (Cmd+A on Mac) to select all, then Ctrl+C (Cmd+C) to copy
              </p>
            </div>
          )}
          
          {/* Debug Logs */}
          <details data-debug="true" style={{ marginTop: '8px' }}>
            <summary style={{ cursor: 'pointer', userSelect: 'none' }}>Debug Logs ({debugLogs.length})</summary>
            <div style={{ 
              marginTop: '4px', 
              maxHeight: '200px', 
              overflowY: 'auto',
              fontSize: '10px',
              lineHeight: '1.4',
              backgroundColor: '#0d1117',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #30363d',
              userSelect: 'text',
              WebkitUserSelect: 'text',
              MozUserSelect: 'text',
              msUserSelect: 'text'
            }}>
              {debugLogs.map((log, index) => (
                <div key={index} style={{ 
                  marginBottom: '2px',
                  color: log.type === 'error' ? '#ff6b6b' : 
                         log.type === 'warning' ? '#ffd93d' : 
                         log.type === 'success' ? '#6bcf7f' : '#8b949e'
                }}>
                  <span style={{ color: '#6e7681' }}>[{log.time}]</span> {log.message}
                </div>
              ))}
              {debugLogs.length === 0 && (
                <div style={{ color: '#6e7681' }}>No debug logs yet...</div>
              )}
            </div>
          </details>
          
          {/* Visual Diff Logs Section */}
          <details data-debug="true" style={{ marginTop: '8px' }} open>
            <summary style={{ cursor: 'pointer', userSelect: 'none' }}>Visual Diff Logs ({visualDiffLogs.length})</summary>
            <div style={{ 
              marginTop: '4px', 
              maxHeight: '200px', 
              overflowY: 'auto',
              fontSize: '10px',
              lineHeight: '1.4',
              backgroundColor: '#0d1117',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #30363d',
              userSelect: 'text',
              WebkitUserSelect: 'text',
              MozUserSelect: 'text',
              msUserSelect: 'text'
            }}>
              {visualDiffLogs.map((log, index) => (
                <div key={index} style={{ marginBottom: '2px', color: log.message.includes('❌') ? '#ff6b6b' : '#8b949e' }}>
                  <span style={{ color: '#6e7681' }}>[{log.timestamp}]</span> {log.message}
                  {log.data && (
                    <pre style={{ fontSize: '9px', color: '#666', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
              {visualDiffLogs.length === 0 && (
                <div style={{ color: '#6e7681' }}>No visual diff activity yet...</div>
              )}
            </div>
          </details>
          
          <details data-debug="true" style={{ marginTop: '8px' }}>
            <summary style={{ cursor: 'pointer' }}>Audit Log (last 10)</summary>
            <div style={{ 
              marginTop: '4px', 
              maxHeight: '150px', 
              overflowY: 'auto',
              fontSize: '10px',
              lineHeight: '1.4'
            }}>
              {AuditLogger.getRecentLogs(10).reverse().map((log, index) => (
                <div key={index} style={{ 
                  marginBottom: '4px',
                  padding: '2px 4px',
                  backgroundColor: log.result === 'failure' ? '#fee2e2' : 
                                   log.result === 'rejected' ? '#fef3c7' : '#d1fae5',
                  borderRadius: '2px',
                  color: '#1f2937'
                }}>
                  <div>
                    {new Date(log.timestamp).toLocaleTimeString()} - 
                    <strong> {log.toolName}</strong> - 
                    {log.result} 
                    {log.autonomyMode && ` (${log.autonomyMode})`}
                  </div>
                  {log.error && <div style={{ color: '#ef4444' }}>Error: {log.error}</div>}
                </div>
              ))}
              {AuditLogger.getRecentLogs(10).length === 0 && (
                <div style={{ color: '#6b7280' }}>No tool executions logged</div>
              )}
            </div>
          </details>
        </div>
      </details>
      
      {/* Diff Preview Bar */}
      <DiffPreviewBar
        onApply={applyDiffChanges}
        onCancel={cancelPreview}
        isLoading={isDiffLoading}
      />
    </div>
  )
}