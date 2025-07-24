import React from 'react'
import { CheckIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { useAcceptRejectButtonStyles } from '../../hooks/useAcceptRejectButtonStyles'
import { ExcelDiffRenderer } from './diff/ExcelDiffRenderer'

export interface PendingAction {
  id: string
  toolName: string
  parameters: any
  description: string
  timestamp: Date
  status?: 'pending' | 'executing' | 'completed' | 'failed'
  error?: string
  preview?: any  // Structured preview data
  previewType?: string  // Type of preview: excel_diff, image, json, none
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
  'create_audit_trail': 'Create audit documentation',
  'format_range': 'Format cells',
  'create_chart': 'Create chart',
  'validate_model': 'Validate model',
  'create_named_range': 'Create named range',
  'insert_rows_columns': 'Insert rows/columns',
  'clear_range': 'Clear cells',
  'copy_range': 'Copy cells'
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
      case 'format_range':
        return `Range: ${params.range || 'N/A'}, Format: ${params.format_type || params.number_format || 'N/A'}`
      case 'create_chart':
        return `Type: ${params.chart_type || 'N/A'}, Data: ${params.data_range || 'N/A'}`
      case 'create_named_range':
        return `Name: ${params.name || 'N/A'}, Range: ${params.range || 'N/A'}`
      case 'insert_rows_columns':
        return `Insert ${params.count || 0} ${params.type || 'rows'} at ${params.position || 'N/A'}`
      case 'clear_range':
        return `Range: ${params.range || 'N/A'}, Type: ${params.clear_type || 'all'}`
      case 'copy_range':
        return `From: ${params.source_range || 'N/A'} To: ${params.destination_range || 'N/A'}`
      default:
        // Show first few key-value pairs
        return Object.entries(params)
          .slice(0, 2)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ')
    }
  }

  const renderPreview = () => {
    if (!action.preview) return null

    // If preview is a structured object with preview data
    if (typeof action.preview === 'object' && action.preview.preview_type) {
      const previewType = action.preview.preview_type || action.previewType

      switch (previewType) {
        case 'excel_diff':
          // For Excel diff, we need to have the diff data in the preview
          if (action.preview.diff || action.preview.changes) {
            return (
              <div className="mt-3 border-t border-blue-200 pt-3 max-h-48 overflow-y-auto">
                <ExcelDiffRenderer 
                  diff={action.preview.diff || action.preview.changes} 
                />
              </div>
            )
          }
          break
        
        case 'json':
          // For JSON preview, show formatted JSON
          return (
            <div className="mt-3 border-t border-blue-200 pt-3">
              <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto max-h-32">
                {JSON.stringify(action.preview.data || action.preview, null, 2)}
              </pre>
            </div>
          )
        
        case 'text':
          // For text preview, show as-is
          return (
            <div className="mt-3 border-t border-blue-200 pt-3 text-xs text-gray-600">
              {action.preview.text || action.preview}
            </div>
          )
      }
    }

    // Fallback: if preview is just a string
    if (typeof action.preview === 'string') {
      return (
        <div className="mt-3 border-t border-blue-200 pt-3 text-xs text-gray-600">
          {action.preview}
        </div>
      )
    }

    return null
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
          
          {renderPreview()}
          
          <div className="flex items-center gap-2 mt-3">
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
  aiIsGenerating?: boolean
}

export const BatchActionPreview: React.FC<BatchActionPreviewProps> = ({
  actions,
  onApproveAll,
  onRejectAll,
  onApproveOne,
  onRejectOne,
  isProcessing = false,
  aiIsGenerating = false
}) => {
  if (actions.length === 0) return null
  
  // Get dynamic button styles for batch actions
  const pendingActionsCount = actions.filter(a => !a.status || a.status === 'pending').length
  const { acceptAllStyle, rejectAllStyle, acceptAllAnimationClass, rejectAllAnimationClass } = useAcceptRejectButtonStyles(
    aiIsGenerating,
    pendingActionsCount > 0
  )
  
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
              className={acceptAllAnimationClass}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                ...acceptAllStyle,
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!isProcessing && acceptAllStyle[':hover']) {
                  e.currentTarget.style.backgroundColor = acceptAllStyle[':hover'].backgroundColor
                }
              }}
              onMouseLeave={(e) => {
                if (!isProcessing) {
                  e.currentTarget.style.backgroundColor = acceptAllStyle.backgroundColor
                }
              }}
            >
              <CheckIcon style={{ width: '14px', height: '14px' }} />
              Approve All
            </button>
            
            <button
              onClick={onRejectAll}
              disabled={isProcessing}
              className={rejectAllAnimationClass}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                ...rejectAllStyle,
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!isProcessing && rejectAllStyle[':hover']) {
                  e.currentTarget.style.backgroundColor = rejectAllStyle[':hover'].backgroundColor
                }
              }}
              onMouseLeave={(e) => {
                if (!isProcessing) {
                  e.currentTarget.style.backgroundColor = rejectAllStyle.backgroundColor
                }
              }}
            >
              <XMarkIcon style={{ width: '14px', height: '14px' }} />
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