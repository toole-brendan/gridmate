import React, { useState } from 'react'
import { ResponseToolsGroupMessage } from '../../../types/enhanced-chat'
import { CheckCircleIcon, XCircleIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid'
import { useAcceptRejectButtonStyles } from '../../../hooks/useAcceptRejectButtonStyles'

interface ResponseToolsGroupCardProps {
  message: ResponseToolsGroupMessage
  aiIsGenerating?: boolean
}

export const ResponseToolsGroupCard: React.FC<ResponseToolsGroupCardProps> = ({ message, aiIsGenerating = false }) => {
  const [isExpanded, setIsExpanded] = useState(!message.collapsed)
  
  const getStatusColor = () => {
    switch (message.status) {
      case 'completed': return 'border-green-500/50 bg-green-500/5'
      case 'in-progress': return 'border-blue-500/50 bg-blue-500/5'
      case 'failed': return 'border-red-500/50 bg-red-500/5'
      default: return 'border-yellow-500/50 bg-yellow-500/5' // pending
    }
  }

  const getStatusIcon = () => {
    switch (message.status) {
      case 'completed':
        return <CheckCircleSolidIcon className="w-4 h-4 text-green-400" />
      case 'in-progress':
        return <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      case 'failed':
        return <XCircleIcon className="w-4 h-4 text-red-400" />
      default:
        return <div className="w-4 h-4 rounded-full bg-yellow-400/20 border border-yellow-400/50" />
    }
  }

  const pendingCount = message.tools.filter(tool => tool.status === 'pending').length
  const acceptedCount = message.tools.filter(tool => tool.status === 'accepted').length
  const rejectedCount = message.tools.filter(tool => tool.status === 'rejected').length

  // Get dynamic button styles
  const { acceptAllClasses, rejectAllClasses } = useAcceptRejectButtonStyles(
    aiIsGenerating,
    pendingCount > 0
  )

  return (
    <div 
      className={`relative border-l-4 border-orange-500 bg-gray-800/30 rounded-r-lg p-2 transition-all duration-200 ${getStatusColor()}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 text-xs font-mono hover:text-gray-300 transition-colors"
            style={{fontFamily: 'IBM Plex Mono, monospace'}}
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-3 h-3" />
            ) : (
              <ChevronRightIcon className="w-3 h-3" />
            )}
            <span>AI Response Tools ({message.tools.length})</span>
          </button>
          {getStatusIcon()}
        </div>
        
        {/* Status summary */}
        <div className="flex items-center space-x-2 text-xs font-mono" style={{fontFamily: 'IBM Plex Mono, monospace'}}>
          {pendingCount > 0 && (
            <span className="text-yellow-400">{pendingCount} pending</span>
          )}
          {acceptedCount > 0 && (
            <span className="text-green-400">{acceptedCount} accepted</span>
          )}
          {rejectedCount > 0 && (
            <span className="text-red-400">{rejectedCount} rejected</span>
          )}
        </div>
      </div>

      {/* Bulk action buttons - only show if pending tools exist */}
      {message.status === 'pending' && pendingCount > 0 && (
        <div className="flex items-center space-x-1 mb-2">
          <button
            onClick={message.actions.acceptAll}
            className={`flex-1 inline-flex items-center justify-center px-2 py-1 border rounded text-xs font-mono ${acceptAllClasses}`}
            style={{fontFamily: 'IBM Plex Mono, monospace'}}
          >
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            Accept All ({pendingCount})
          </button>
          
          <button
            onClick={message.actions.rejectAll}
            className={`flex-1 inline-flex items-center justify-center px-2 py-1 border rounded text-xs font-mono ${rejectAllClasses}`}
            style={{fontFamily: 'IBM Plex Mono, monospace'}}
          >
            <XCircleIcon className="w-3 h-3 mr-1" />
            Reject All ({pendingCount})
          </button>
        </div>
      )}

      {/* Expanded tool list */}
      {isExpanded && (
        <div className="space-y-1">
          {message.tools.map((tool, index) => (
            <div 
              key={tool.id}
              className="flex items-center space-x-2 p-1 bg-gray-800/20 rounded text-xs font-mono"
              style={{fontFamily: 'IBM Plex Mono, monospace'}}
            >
              <span className="text-gray-500 w-6">{index + 1}.</span>
              <div className="flex-shrink-0">
                <div className="w-4 h-4 rounded bg-blue-500/20 flex items-center justify-center">
                  <span className="text-blue-400 text-xs">🔧</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-gray-300">{tool.tool.name}</span>
                <span className="text-gray-500 ml-2 truncate">{tool.tool.description}</span>
              </div>
              <div className="flex-shrink-0">
                {tool.status === 'accepted' && <CheckCircleSolidIcon className="w-4 h-4 text-green-400" />}
                {tool.status === 'rejected' && <XCircleIcon className="w-4 h-4 text-red-400" />}
                {tool.status === 'pending' && <div className="w-4 h-4 rounded-full bg-yellow-400/20 border border-yellow-400/50" />}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Progress indicator for in-progress state */}
      {message.status === 'in-progress' && (
        <div className="mt-2">
          <div className="text-xs text-gray-400 mb-1 font-mono" style={{fontFamily: 'IBM Plex Mono, monospace'}}>
            Processing tools...
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1">
            <div 
              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${((acceptedCount + rejectedCount) / message.tools.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Completion message */}
      {message.status === 'completed' && (
        <div className="mt-2 text-xs text-green-400 font-mono" style={{fontFamily: 'IBM Plex Mono, monospace'}}>
          ✓ All tools processed ({acceptedCount} accepted, {rejectedCount} rejected)
        </div>
      )}
    </div>
  )
}