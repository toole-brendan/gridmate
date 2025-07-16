import React, { useState, useMemo } from 'react'
import { BatchOperationMessage } from '../../../types/enhanced-chat'
import { ToolSuggestionCard } from './ToolSuggestionCard'
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface BatchOperationCardProps {
  message: BatchOperationMessage
}

export const BatchOperationCard: React.FC<BatchOperationCardProps> = ({ message }) => {
  const [isExpanded, setIsExpanded] = useState(!message.batch.collapsed)

  const progress = useMemo(() => {
    if (!message.batch.progress) {
      return {
        completed: 0,
        failed: 0,
        pending: message.batch.totalOperations,
        percentage: 0
      }
    }
    
    const { completed, failed, pending } = message.batch.progress
    const total = completed + failed + pending
    const percentage = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0
    
    return { completed, failed, pending, percentage }
  }, [message.batch.progress, message.batch.totalOperations])

  const getStatusColor = () => {
    switch (message.status) {
      case 'completed': return 'border-green-500/30 bg-green-500/5'
      case 'failed': return 'border-red-500/30 bg-red-500/5'
      case 'partial': return 'border-yellow-500/30 bg-yellow-500/5'
      case 'in-progress': return 'border-blue-500/30 bg-blue-500/5'
      default: return 'border-gray-500/30 bg-gray-500/5'
    }
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
    message.actions.collapse()
  }

  const handleApproveAll = () => {
    message.actions.approveAll()
  }

  const handleRejectAll = () => {
    message.actions.rejectAll()
  }

  const renderDependencyGraph = () => {
    if (!message.batch.dependencies || message.batch.dependencies.length === 0) return null

    return (
      <div className="mt-3 p-3 bg-gray-800/30 rounded-md">
        <div className="text-xs text-gray-400 mb-2">Dependencies:</div>
        <div className="space-y-1">
          {message.batch.dependencies.map((dep, index) => (
            <div key={index} className="flex items-center text-xs">
              <span className="text-gray-300">{dep.from}</span>
              <span className="mx-2 text-gray-500">→</span>
              <span className="text-gray-300">{dep.to}</span>
              <span className="ml-2 text-gray-500">({dep.type})</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border transition-all duration-200 ${getStatusColor()}`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3 flex-1">
            <button
              onClick={toggleExpanded}
              className="flex-shrink-0 p-1 rounded hover:bg-gray-700/50 transition-colors"
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRightIcon className="w-4 h-4 text-gray-400" />
              )}
            </button>
            
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-100">
                📦 {message.batch.title} ({message.batch.totalOperations} operations)
              </h4>
              {message.batch.description && (
                <p className="text-xs text-gray-400 mt-0.5">{message.batch.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {progress.pending > 0 && (
              <span className="flex items-center text-xs text-gray-400">
                <ClockIcon className="w-3 h-3 mr-1" />
                {progress.pending} pending
              </span>
            )}
            {progress.completed > 0 && (
              <span className="flex items-center text-xs text-green-400">
                <CheckCircleIcon className="w-3 h-3 mr-1" />
                {progress.completed}
              </span>
            )}
            {progress.failed > 0 && (
              <span className="flex items-center text-xs text-red-400">
                <XCircleIcon className="w-3 h-3 mr-1" />
                {progress.failed}
              </span>
            )}
          </div>
        </div>

        {message.status === 'in-progress' && progress.percentage > 0 && (
          <div className="mb-3">
            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Progress: {progress.percentage}% ({progress.completed + progress.failed} of {message.batch.totalOperations})
            </div>
          </div>
        )}

        {isExpanded && (
          <div className="space-y-2 mt-3">
            {renderDependencyGraph()}
            
            <div className="space-y-2 mt-3">
              {message.batch.operations.map((operation) => (
                <ToolSuggestionCard
                  key={operation.id}
                  message={operation}
                />
              ))}
            </div>
          </div>
        )}

        {message.status === 'pending' && (
          <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-700/50">
            <button
              onClick={handleApproveAll}
              className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-green-500/50 text-green-400 bg-green-500/10 rounded-md hover:bg-green-500/20 transition-colors duration-150 text-sm"
            >
              <CheckCircleIcon className="w-4 h-4 mr-1.5" />
              Approve All
            </button>
            
            <button
              onClick={handleRejectAll}
              className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-red-500/50 text-red-400 bg-red-500/10 rounded-md hover:bg-red-500/20 transition-colors duration-150 text-sm"
            >
              <XCircleIcon className="w-4 h-4 mr-1.5" />
              Reject All
            </button>
          </div>
        )}
      </div>
    </div>
  )
}