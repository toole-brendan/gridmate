import React, { useState } from 'react'
import { ToolResultMessage } from '../../../types/enhanced-chat'
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  ArrowUturnLeftIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline'
import { ExcelDiffRenderer } from '../diff'

interface ToolResultCardProps {
  message: ToolResultMessage
}

export const ToolResultCard: React.FC<ToolResultCardProps> = ({ message }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusIcon = () => {
    switch (message.status) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-400" />
      case 'partial':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />
      case 'cancelled':
        return <XCircleIcon className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = () => {
    switch (message.status) {
      case 'success':
        return 'border-green-500/30 bg-green-500/5'
      case 'failed':
        return 'border-red-500/30 bg-red-500/5'
      case 'partial':
        return 'border-yellow-500/30 bg-yellow-500/5'
      case 'cancelled':
        return 'border-gray-500/30 bg-gray-500/5'
    }
  }

  const formatExecutionTime = (ms?: number) => {
    if (!ms) return null
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <div className={`rounded-lg border transition-all duration-200 ${getStatusColor()}`}>
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">{getStatusIcon()}</div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-medium text-gray-100">{message.tool.name}</h4>
                {message.details?.executionTime && (
                  <span className="text-xs text-gray-500">
                    {formatExecutionTime(message.details.executionTime)}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-300 mt-0.5">{message.summary}</p>
            </div>
          </div>

          {(message.details || message.actions) && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-2 p-1 rounded hover:bg-gray-700/50 transition-colors"
            >
              {isExpanded ? (
                <ChevronUpIcon className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
              )}
            </button>
          )}
        </div>

        {isExpanded && message.details && (
          <div className="mt-3 pt-3 border-t border-gray-700/50">
            {message.details.changedCells && (
              <div className="text-xs text-gray-400 mb-2">
                Changed cells: {message.details.changedCells}
              </div>
            )}

            {message.details.error && (
              <div className="p-2 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-300 mb-2">
                {message.details.error}
              </div>
            )}

            {message.details.diff && (
              <div className="mb-2">
                <ExcelDiffRenderer diff={message.details.diff} />
              </div>
            )}

            {message.actions && (
              <div className="flex items-center space-x-2 mt-3">
                {message.actions.undo && (
                  <button
                    onClick={message.actions.undo}
                    className="inline-flex items-center px-2 py-1 text-xs border border-gray-600 text-gray-300 bg-gray-700/50 rounded hover:bg-gray-700 transition-colors"
                  >
                    <ArrowUturnLeftIcon className="w-3 h-3 mr-1" />
                    Undo
                  </button>
                )}
                
                {message.actions.retry && (
                  <button
                    onClick={message.actions.retry}
                    className="inline-flex items-center px-2 py-1 text-xs border border-blue-600 text-blue-300 bg-blue-700/50 rounded hover:bg-blue-700 transition-colors"
                  >
                    <ArrowPathIcon className="w-3 h-3 mr-1" />
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}