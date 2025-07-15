import React, { useState, useEffect } from 'react'
import { ToolSuggestionMessage } from '../../../types/enhanced-chat'
import { CheckCircleIcon, XCircleIcon, PencilIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolidIcon, XCircleIcon as XCircleSolidIcon } from '@heroicons/react/24/solid'
import { ExcelDiffRenderer } from '../diff'

interface ToolSuggestionCardProps {
  message: ToolSuggestionMessage
  onApprove?: () => void
  onReject?: () => void
  onModify?: () => void
}

export const ToolSuggestionCard: React.FC<ToolSuggestionCardProps> = ({
  message,
  onApprove,
  onReject,
  onModify
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<string>('')

  useEffect(() => {
    if (message.expiresAt && message.status === 'pending') {
      const interval = setInterval(() => {
        const remaining = new Date(message.expiresAt).getTime() - Date.now()
        if (remaining <= 0) {
          setTimeRemaining('Expired')
          clearInterval(interval)
        } else {
          const seconds = Math.floor(remaining / 1000)
          const minutes = Math.floor(seconds / 60)
          setTimeRemaining(`${minutes}:${(seconds % 60).toString().padStart(2, '0')}`)
        }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [message.expiresAt, message.status])

  const getRiskLevelColor = (level?: string) => {
    switch (level) {
      case 'high': return 'text-red-400 bg-red-400/10'
      case 'medium': return 'text-yellow-400 bg-yellow-400/10'
      case 'low': return 'text-green-400 bg-green-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  const isReadTool = () => {
    return message.tool.name.startsWith('read_')
  }

  const getStatusColor = () => {
    // Special styling for read tools
    if (isReadTool()) {
      switch (message.status) {
        case 'approved': return 'border-gray-500/50 bg-gray-600/10'
        case 'rejected': return 'border-red-500/50 bg-red-500/5'
        case 'expired': return 'border-gray-500/50 bg-gray-500/5'
        default: return 'border-gray-500/50 bg-gray-600/10'
      }
    }
    
    // Regular styling for other tools
    switch (message.status) {
      case 'approved': return 'border-green-500/50 bg-green-500/5'
      case 'rejected': return 'border-red-500/50 bg-red-500/5'
      case 'expired': return 'border-gray-500/50 bg-gray-500/5'
      default: return 'border-blue-500/50 bg-blue-500/5'
    }
  }

  const handleApprove = () => {
    message.actions.approve()
    onApprove?.()
  }

  const handleReject = () => {
    message.actions.reject()
    onReject?.()
  }

  const handleModify = () => {
    message.actions.modify?.()
    onModify?.()
  }

  return (
    <div
      className={`relative rounded-lg border transition-all duration-200 ${getStatusColor()} ${
        isHovered && message.status === 'pending' ? 'shadow-lg' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-2">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center space-x-2">
            {!isReadTool() && (
              <div className="flex-shrink-0">
                <div className="w-5 h-5 rounded bg-blue-500/20 flex items-center justify-center">
                  <span className="text-blue-400 text-xs">🔧</span>
                </div>
              </div>
            )}
            <div>
              <h4 className="text-xs font-mono font-medium text-gray-100" style={{fontFamily: 'IBM Plex Mono, monospace'}}>
                {isReadTool() ? (
                  <>
                    read {message.tool.parameters.range || message.tool.parameters.address || 'data'}
                    {message.tool.description && message.tool.description.includes('(Auto-approved)') && 
                      <span className="text-gray-500 ml-1">(Auto-approved)</span>
                    }
                  </>
                ) : (
                  message.tool.name
                )}
              </h4>
              {!isReadTool() && (
                <p className="text-xs text-gray-400 font-mono" style={{fontFamily: 'IBM Plex Mono, monospace'}}>{message.tool.description}</p>
              )}
            </div>
          </div>
          
          {message.status === 'pending' && timeRemaining && (
            <span className="text-xs text-gray-400 flex items-center font-mono" style={{fontFamily: 'IBM Plex Mono, monospace'}}>
              <ClockIcon className="w-3 h-3 mr-1" />
              {timeRemaining}
            </span>
          )}

          {message.status === 'approved' && !isReadTool() && (
            <CheckCircleSolidIcon className="w-5 h-5 text-green-400" />
          )}
          
          {message.status === 'rejected' && (
            <XCircleSolidIcon className="w-5 h-5 text-red-400" />
          )}
        </div>

        {message.tool.preview && (
          <div className="mb-1">
            <ExcelDiffRenderer diff={message.tool.preview} />
          </div>
        )}

        {message.tool.parameters && Object.keys(message.tool.parameters).length > 0 && (
          <div className="mb-1">
            <details className="cursor-pointer">
              <summary className="text-xs text-gray-400 hover:text-gray-300 font-mono" style={{fontFamily: 'IBM Plex Mono, monospace'}}>
                Parameters ({Object.keys(message.tool.parameters).length})
              </summary>
              <div className="mt-1 p-1 bg-gray-800/30 rounded text-xs font-mono text-gray-300" style={{fontFamily: 'IBM Plex Mono, monospace'}}>
                <pre style={{fontFamily: 'IBM Plex Mono, monospace'}}>{JSON.stringify(message.tool.parameters, null, 2)}</pre>
              </div>
            </details>
          </div>
        )}

        {message.status === 'pending' && (
          <div className="flex items-center space-x-1 mt-2">
            <button
              onClick={handleApprove}
              className="flex-1 inline-flex items-center justify-center px-2 py-1 border border-green-500/50 text-green-400 bg-green-500/10 rounded hover:bg-green-500/20 transition-colors duration-150 text-xs font-mono" style={{fontFamily: 'IBM Plex Mono, monospace'}}
            >
              <CheckCircleIcon className="w-3 h-3 mr-1" />
              Approve
            </button>
            
            <button
              onClick={handleReject}
              className="flex-1 inline-flex items-center justify-center px-2 py-1 border border-red-500/50 text-red-400 bg-red-500/10 rounded hover:bg-red-500/20 transition-colors duration-150 text-xs font-mono" style={{fontFamily: 'IBM Plex Mono, monospace'}}
            >
              <XCircleIcon className="w-3 h-3 mr-1" />
              Reject
            </button>
            
            {message.actions.modify && (
              <button
                onClick={handleModify}
                className="inline-flex items-center justify-center px-2 py-1 border border-gray-500/50 text-gray-400 bg-gray-500/10 rounded hover:bg-gray-500/20 transition-colors duration-150 text-xs font-mono" style={{fontFamily: 'IBM Plex Mono, monospace'}}
              >
                <PencilIcon className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {message.tool.estimatedTime && (
          <div className="mt-1 text-xs text-gray-500 font-mono" style={{fontFamily: 'IBM Plex Mono, monospace'}}>
            Estimated time: {message.tool.estimatedTime}
          </div>
        )}
      </div>

      {isHovered && message.status === 'pending' && (
        <div className="absolute inset-0 rounded-lg ring-2 ring-blue-500/30 pointer-events-none animate-pulse" />
      )}
    </div>
  )
}