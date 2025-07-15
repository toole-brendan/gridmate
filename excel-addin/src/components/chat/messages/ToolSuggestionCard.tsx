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

  const getStatusColor = () => {
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
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <span className="text-blue-400 text-sm">🔧</span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-100">{message.tool.name}</h4>
              <p className="text-xs text-gray-400 mt-0.5">{message.tool.description}</p>
            </div>
          </div>
          
          {message.status === 'pending' && (
            <div className="flex items-center space-x-2">
              {timeRemaining && (
                <span className="text-xs text-gray-400 flex items-center">
                  <ClockIcon className="w-3 h-3 mr-1" />
                  {timeRemaining}
                </span>
              )}
              {message.tool.riskLevel && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${getRiskLevelColor(message.tool.riskLevel)}`}>
                  {message.tool.riskLevel} risk
                </span>
              )}
            </div>
          )}

          {message.status === 'approved' && (
            <CheckCircleSolidIcon className="w-5 h-5 text-green-400" />
          )}
          
          {message.status === 'rejected' && (
            <XCircleSolidIcon className="w-5 h-5 text-red-400" />
          )}
        </div>

        {message.tool.preview && (
          <div className="mb-3">
            <ExcelDiffRenderer diff={message.tool.preview} />
          </div>
        )}

        {message.tool.parameters && Object.keys(message.tool.parameters).length > 0 && (
          <div className="mb-3">
            <details className="cursor-pointer">
              <summary className="text-xs text-gray-400 hover:text-gray-300">
                Parameters ({Object.keys(message.tool.parameters).length})
              </summary>
              <div className="mt-2 p-2 bg-gray-800/30 rounded text-xs font-mono text-gray-300">
                <pre>{JSON.stringify(message.tool.parameters, null, 2)}</pre>
              </div>
            </details>
          </div>
        )}

        {message.status === 'pending' && (
          <div className="flex items-center space-x-2 mt-3">
            <button
              onClick={handleApprove}
              className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-green-500/50 text-green-400 bg-green-500/10 rounded-md hover:bg-green-500/20 transition-colors duration-150 text-sm"
            >
              <CheckCircleIcon className="w-4 h-4 mr-1.5" />
              Approve
            </button>
            
            <button
              onClick={handleReject}
              className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-red-500/50 text-red-400 bg-red-500/10 rounded-md hover:bg-red-500/20 transition-colors duration-150 text-sm"
            >
              <XCircleIcon className="w-4 h-4 mr-1.5" />
              Reject
            </button>
            
            {message.actions.modify && (
              <button
                onClick={handleModify}
                className="inline-flex items-center justify-center px-3 py-1.5 border border-gray-500/50 text-gray-400 bg-gray-500/10 rounded-md hover:bg-gray-500/20 transition-colors duration-150 text-sm"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {message.tool.estimatedTime && (
          <div className="mt-2 text-xs text-gray-500">
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