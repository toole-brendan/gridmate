import React from 'react'
import { PendingAction } from './ActionPreview'
import { CheckIcon, XMarkIcon, SparklesIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface PendingActionsPanelProps {
  actions: PendingAction[]
  onApproveAll: () => void
  onRejectAll: () => void
  onApproveOne: (actionId: string) => void
  onRejectOne: (actionId: string) => void
  isProcessing?: boolean
  aiIsGenerating?: boolean
}

export const PendingActionsPanel: React.FC<PendingActionsPanelProps> = ({
  actions,
  onApproveAll,
  onRejectAll,
  onApproveOne,
  onRejectOne,
  isProcessing = false,
  aiIsGenerating = false
}) => {
  if (actions.length === 0) return null
  
  // Calculate progress for batch execution
  const executingCount = actions.filter(a => a.status === 'executing').length
  const completedCount = actions.filter(a => a.status === 'completed').length
  const failedCount = actions.filter(a => a.status === 'failed').length
  const totalProcessed = completedCount + failedCount
  const isExecutingBatch = executingCount > 0 || (totalProcessed > 0 && totalProcessed < actions.length)

  const getToolDisplayName = (toolName: string): string => {
    const displayNames: { [key: string]: string } = {
      'write_range': 'Write data to spreadsheet',
      'apply_formula': 'Apply formula',
      'format_range': 'Format cells',
      'smart_format_cells': 'Apply smart formatting',
      'create_chart': 'Create chart',
      'build_financial_formula': 'Build financial formula'
    }
    return displayNames[toolName] || toolName
  }

  const getParametersSummary = (action: PendingAction): string => {
    const params = action.parameters
    if (params.range) {
      return `Range: ${params.range}`
    }
    if (params.formula) {
      return `Formula: ${params.formula}`
    }
    if (params.values && Array.isArray(params.values)) {
      const rows = params.values.length
      const cols = params.values[0]?.length || 0
      return `${rows} rows, ${cols} columns`
    }
    return ''
  }

  return (
    <div style={{ 
      backgroundColor: '#f3f4f6',
      borderBottom: '1px solid #e5e7eb',
      padding: '12px 16px',
      maxHeight: '300px',
      overflowY: 'auto'
    }}>
      {/* Header with Accept All / Reject All buttons */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SparklesIcon style={{ width: '20px', height: '20px', color: '#2563eb' }} />
          <h3 style={{ 
            fontSize: '14px', 
            fontWeight: '600', 
            color: '#111827',
            margin: 0
          }}>
            AI wants to perform {actions.length} action{actions.length > 1 ? 's' : ''}
          </h3>
        </div>
        
        {/* Show Accept All / Reject All only when AI is done generating */}
        {!aiIsGenerating && actions.length > 1 && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onApproveAll}
              disabled={isProcessing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.5 : 1
              }}
            >
              <CheckIcon style={{ width: '14px', height: '14px' }} />
              Accept All
            </button>
            <button
              onClick={onRejectAll}
              disabled={isProcessing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.5 : 1
              }}
            >
              <XMarkIcon style={{ width: '14px', height: '14px' }} />
              Reject All
            </button>
          </div>
        )}
      </div>

      {/* Progress bar for batch execution */}
      {isExecutingBatch && actions.length > 1 && (
        <div style={{
          marginBottom: '12px',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          padding: '8px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px',
            fontSize: '12px',
            color: '#6b7280'
          }}>
            <span>Processing {actions.length} actions...</span>
            <span>{totalProcessed} of {actions.length} completed</span>
          </div>
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: '#e5e7eb',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${(totalProcessed / actions.length) * 100}%`,
              height: '100%',
              backgroundColor: failedCount > 0 ? '#f59e0b' : '#10b981',
              transition: 'width 0.3s ease',
              borderRadius: '3px'
            }} />
          </div>
          {failedCount > 0 && (
            <div style={{
              marginTop: '4px',
              fontSize: '11px',
              color: '#ef4444'
            }}>
              {failedCount} action{failedCount > 1 ? 's' : ''} failed
            </div>
          )}
        </div>
      )}

      {/* Individual actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {actions.map((action, index) => (
          <div
            key={action.id}
            style={{
              backgroundColor: action.status === 'executing' ? '#fef3c7' : 
                              action.status === 'completed' ? '#d1fae5' :
                              action.status === 'failed' ? '#fee2e2' : 'white',
              border: `1px solid ${action.status === 'executing' ? '#fbbf24' : 
                                  action.status === 'completed' ? '#10b981' :
                                  action.status === 'failed' ? '#ef4444' : '#e5e7eb'}`,
              borderRadius: '6px',
              padding: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: '13px', 
                fontWeight: '500', 
                color: '#111827',
                marginBottom: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {action.status === 'executing' && (
                  <ArrowPathIcon style={{ 
                    width: '14px', 
                    height: '14px', 
                    animation: 'spin 1s linear infinite' 
                  }} />
                )}
                {action.status === 'completed' && (
                  <CheckIcon style={{ 
                    width: '14px', 
                    height: '14px', 
                    color: '#10b981' 
                  }} />
                )}
                {action.status === 'failed' && (
                  <ExclamationTriangleIcon style={{ 
                    width: '14px', 
                    height: '14px', 
                    color: '#ef4444' 
                  }} />
                )}
                {index + 1}. {getToolDisplayName(action.toolName)}
                {action.status === 'executing' && ' (Executing...)'}
                {action.status === 'completed' && ' (Done)'}
                {action.status === 'failed' && ' (Failed)'}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: action.status === 'failed' ? '#dc2626' : '#6b7280' 
              }}>
                {action.status === 'failed' && action.error 
                  ? `Error: ${action.error}`
                  : getParametersSummary(action)
                }
              </div>
            </div>
            
            {/* Only show action buttons for pending actions */}
            {(!action.status || action.status === 'pending') && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => onApproveOne(action.id)}
                  disabled={isProcessing}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '500',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    opacity: isProcessing ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <CheckIcon style={{ width: '12px', height: '12px' }} />
                  Approve
                </button>
                <button
                  onClick={() => onRejectOne(action.id)}
                  disabled={isProcessing}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '500',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    opacity: isProcessing ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <XMarkIcon style={{ width: '12px', height: '12px' }} />
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Status message when AI is still generating */}
      {aiIsGenerating && (
        <div style={{
          marginTop: '8px',
          fontSize: '12px',
          color: '#6b7280',
          fontStyle: 'italic',
          textAlign: 'center'
        }}>
          AI is still generating more actions...
        </div>
      )}
    </div>
  )
}

// Add CSS animation for spinning icon
const style = document.createElement('style')
style.textContent = `
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`
document.head.appendChild(style)