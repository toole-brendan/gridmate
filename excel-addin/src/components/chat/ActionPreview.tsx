import React from 'react'
import { CheckIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline'

export interface PendingAction {
  id: string
  toolName: string
  parameters: any
  description: string
  timestamp: Date
}

interface ActionPreviewProps {
  action: PendingAction
  onApprove: (actionId: string) => void
  onReject: (actionId: string) => void
  isProcessing?: boolean
}

const TOOL_DESCRIPTIONS: { [key: string]: string } = {
  'read_range': 'Read data from spreadsheet',
  'write_range': 'Write data to spreadsheet',
  'apply_formula': 'Apply formula to cells',
  'smart_format_cells': 'Format cells',
  'analyze_model_structure': 'Analyze spreadsheet structure',
  'build_financial_formula': 'Build financial formula',
  'create_audit_trail': 'Create audit documentation'
}

export const ActionPreview: React.FC<ActionPreviewProps> = ({
  action,
  onApprove,
  onReject,
  isProcessing = false
}) => {
  const toolDescription = TOOL_DESCRIPTIONS[action.toolName] || action.toolName

  const formatParameters = (params: any): string => {
    if (!params) return ''
    
    // Format key parameters based on tool type
    switch (action.toolName) {
      case 'write_range':
        return `Range: ${params.range || 'N/A'}, ${params.values?.length || 0} rows`
      case 'read_range':
        return `Range: ${params.range || 'N/A'}`
      case 'apply_formula':
        return `Range: ${params.range || 'N/A'}, Formula: ${params.formula || 'N/A'}`
      case 'smart_format_cells':
        return `Range: ${params.range || 'N/A'}, Format: ${params.format_type || 'N/A'}`
      default:
        // Show first few key-value pairs
        return Object.entries(params)
          .slice(0, 2)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')
    }
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3 animate-fadeIn">
      <div className="flex items-start gap-3">
        <SparklesIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-gray-900">
              AI wants to: {toolDescription}
            </h4>
          </div>
          
          <p className="text-xs text-gray-600 mb-3">
            {formatParameters(action.parameters)}
          </p>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => onApprove(action.id)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <CheckIcon className="w-3.5 h-3.5" />
              Approve
            </button>
            
            <button
              onClick={() => onReject(action.id)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
              Reject
            </button>
            
            {isProcessing && (
              <span className="text-xs text-gray-500 ml-2">Processing...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Batch preview for multiple actions
interface BatchActionPreviewProps {
  actions: PendingAction[]
  onApproveAll: () => void
  onRejectAll: () => void
  onApproveOne: (actionId: string) => void
  onRejectOne: (actionId: string) => void
  isProcessing?: boolean
}

export const BatchActionPreview: React.FC<BatchActionPreviewProps> = ({
  actions,
  onApproveAll,
  onRejectAll,
  onApproveOne,
  onRejectOne,
  isProcessing = false
}) => {
  if (actions.length === 0) return null
  
  if (actions.length === 1) {
    return (
      <ActionPreview
        action={actions[0]}
        onApprove={onApproveOne}
        onReject={onRejectOne}
        isProcessing={isProcessing}
      />
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3 animate-fadeIn">
      <div className="flex items-start gap-3">
        <SparklesIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            AI wants to perform {actions.length} actions:
          </h4>
          
          <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
            {actions.map((action, index) => (
              <div key={action.id} className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">{index + 1}.</span>
                <span className="text-gray-700">
                  {TOOL_DESCRIPTIONS[action.toolName] || action.toolName}
                </span>
                <span className="text-gray-500">
                  ({formatParameters(action.parameters)})
                </span>
              </div>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onApproveAll}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <CheckIcon className="w-3.5 h-3.5" />
              Approve All
            </button>
            
            <button
              onClick={onRejectAll}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
              Reject All
            </button>
            
            {isProcessing && (
              <span className="text-xs text-gray-500 ml-2">Processing...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to format parameters for display
const formatParameters = (params: any): string => {
  if (!params) return ''
  
  try {
    return JSON.stringify(params, null, 2)
  } catch {
    return String(params)
  }
}