import { useState, useCallback, useEffect } from 'react'
import { useDiffStore } from '../store/diffStore'
import { ExcelService, WorkbookSnapshot } from '../services/excel/ExcelService'
import { GridVisualizer } from '../services/diff/GridVisualizer'
import { AISuggestedOperation, DiffPayload, DiffMessage } from '../types/diff'
import { SignalRClient } from '../services/signalr/SignalRClient'
import axios from 'axios'

interface UseDiffPreviewReturn {
  initiatePreview: (operations: AISuggestedOperation[]) => Promise<void>
  applyChanges: () => Promise<void>
  cancelPreview: () => Promise<void>
  isLoading: boolean
  error: string | null
}

export function useDiffPreview(
  signalRClient: SignalRClient | null,
  workbookId: string
): UseDiffPreviewReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { 
    setPreview, 
    clearPreview, 
    setStatus, 
    setError: setStoreError,
    hunks,
    pendingOperations,
    status
  } = useDiffStore()

  // Listen for diff messages from SignalR
  useEffect(() => {
    if (!signalRClient) return

    const handleDiffMessage = (message: DiffMessage) => {
      if (message.workbookId === workbookId && pendingOperations) {
        // Update store with received diff
        setPreview(message.hunks, pendingOperations, workbookId)
        
        // Apply visual highlights
        GridVisualizer.applyHighlights(message.hunks).catch(err => {
          console.error('Failed to apply highlights:', err)
          setError('Failed to visualize changes')
        })
      }
    }

    // Subscribe to workbook diff messages
    signalRClient.on('workbookDiff', handleDiffMessage)

    return () => {
      signalRClient.off('workbookDiff', handleDiffMessage)
    }
  }, [signalRClient, workbookId, pendingOperations, setPreview])

  // Initiate diff preview
  const initiatePreview = useCallback(async (operations: AISuggestedOperation[]) => {
    setIsLoading(true)
    setError(null)
    setStatus('computing')

    try {
      // Get current state (before)
      const before = await ExcelService.getInstance().createWorkbookSnapshot({
        rangeAddress: 'UsedRange',
        includeFormulas: true,
        includeStyles: false,
        maxCells: 50000
      })

      // Simulate operations to create "after" state
      const after = await simulateOperations(before, operations)

      // Store operations for later execution
      useDiffStore.setState({ pendingOperations: operations })

      // Send to backend for diff computation
      const token = localStorage.getItem('gridmate_token')
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/v1/excel/diff`,
        {
          workbookId,
          before,
          after
        } as DiffPayload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.data.success) {
        throw new Error('Failed to compute diff')
      }

      // The diff will be received via SignalR and handled by the effect above
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to preview changes'
      setError(errorMessage)
      setStoreError(errorMessage)
      setStatus('idle')
    } finally {
      setIsLoading(false)
    }
  }, [workbookId, setStatus, setStoreError])

  // Apply the previewed changes
  const applyChanges = useCallback(async () => {
    if (!pendingOperations || status !== 'previewing') {
      setError('No changes to apply')
      return
    }

    setIsLoading(true)
    setError(null)
    setStatus('applying')

    try {
      // Execute each operation
      for (const operation of pendingOperations) {
        await ExcelService.getInstance().executeToolRequest(
          operation.tool,
          operation.input
        )
      }

      // Clear highlights
      if (hunks) {
        await GridVisualizer.clearHighlights(hunks)
      }

      setStatus('applied')
      clearPreview()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply changes'
      setError(errorMessage)
      setStoreError(errorMessage)
      setStatus('previewing') // Stay in preview mode
    } finally {
      setIsLoading(false)
    }
  }, [pendingOperations, status, hunks, setStatus, clearPreview, setStoreError])

  // Cancel preview and clear highlights
  const cancelPreview = useCallback(async () => {
    setIsLoading(true)
    
    try {
      // Clear visual highlights
      if (hunks) {
        await GridVisualizer.clearHighlights(hunks)
      }
      
      clearPreview()
      setError(null)
    } catch (err) {
      console.error('Failed to clear highlights:', err)
    } finally {
      setIsLoading(false)
    }
  }, [hunks, clearPreview])

  return {
    initiatePreview,
    applyChanges,
    cancelPreview,
    isLoading,
    error
  }
}

// Simulate operations on a workbook snapshot to create the "after" state
async function simulateOperations(
  before: WorkbookSnapshot,
  operations: AISuggestedOperation[]
): Promise<WorkbookSnapshot> {
  // Create a deep copy of the before state
  const after: WorkbookSnapshot = JSON.parse(JSON.stringify(before))
  
  for (const op of operations) {
    switch (op.tool) {
      case 'write_range':
        simulateWriteRange(after, op.input)
        break
      case 'apply_formula':
        simulateApplyFormula(after, op.input)
        break
      case 'clear_range':
        simulateClearRange(after, op.input)
        break
      // Add more tools as needed
    }
  }
  
  return after
}

function simulateWriteRange(snapshot: WorkbookSnapshot, input: any) {
  const { range, values } = input
  if (!range || !values) return
  
  // Parse range (simplified - assumes current sheet)
  const sheet = 'Sheet1' // TODO: Get from context
  const match = range.match(/([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?/)
  if (!match) return
  
  const startCol = columnToIndex(match[1])
  const startRow = parseInt(match[2]) - 1
  
  // Apply values
  for (let i = 0; i < values.length; i++) {
    for (let j = 0; j < values[i].length; j++) {
      const key = `${sheet}!${indexToColumn(startCol + j)}${startRow + i + 1}`
      snapshot[key] = { v: values[i][j] }
    }
  }
}

function simulateApplyFormula(snapshot: WorkbookSnapshot, input: any) {
  const { range, formula } = input
  if (!range || !formula) return
  
  const sheet = 'Sheet1' // TODO: Get from context
  const key = `${sheet}!${range}`
  snapshot[key] = { f: formula }
}

function simulateClearRange(snapshot: WorkbookSnapshot, input: any) {
  const { range } = input
  if (!range) return
  
  // Simple implementation - just delete the keys
  const sheet = 'Sheet1'
  const keyPrefix = `${sheet}!`
  
  // This is simplified - in reality we'd parse the range properly
  Object.keys(snapshot).forEach(key => {
    if (key.startsWith(keyPrefix) && key.includes(range)) {
      delete snapshot[key]
    }
  })
}

// Helper functions for column conversion
function columnToIndex(col: string): number {
  let index = 0
  for (let i = 0; i < col.length; i++) {
    index = index * 26 + (col.charCodeAt(i) - 'A'.charCodeAt(0) + 1)
  }
  return index - 1
}

function indexToColumn(index: number): string {
  let col = ''
  index++ // Convert to 1-based
  while (index > 0) {
    const remainder = (index - 1) % 26
    col = String.fromCharCode(remainder + 'A'.charCodeAt(0)) + col
    index = Math.floor((index - 1) / 26)
  }
  return col
}