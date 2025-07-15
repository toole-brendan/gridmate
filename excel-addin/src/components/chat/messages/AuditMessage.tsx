import React from 'react'
import { AuditMessage as AuditMessageType } from '../../../types/enhanced-chat'
import { 
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

interface AuditMessageProps {
  message: AuditMessageType
}

export const AuditMessage: React.FC<AuditMessageProps> = ({ message }) => {
  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'just now'
  }

  const getStatusIcon = () => {
    return message.audit.status === 'success' ? (
      <CheckCircleIcon className="w-4 h-4 text-green-400" />
    ) : (
      <XCircleIcon className="w-4 h-4 text-red-400" />
    )
  }

  const toggleExpand = () => {
    message.actions.toggleExpand()
  }

  const handleExport = () => {
    message.actions.export?.()
  }

  return (
    <div className="rounded-lg border border-gray-700/50 bg-gray-800/30 p-3 text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleExpand}
            className="flex-shrink-0 p-0.5 rounded hover:bg-gray-700/50 transition-colors"
          >
            {message.expanded ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          <DocumentTextIcon className="w-4 h-4 text-gray-500" />
          
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">System</span>
            {getStatusIcon()}
          </div>
          
          <span className="text-gray-300">{message.audit.operation}</span>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className="text-xs text-gray-500">
            {formatTimestamp(message.audit.timestamp)}
          </span>
          
          {message.actions.export && (
            <button
              onClick={handleExport}
              className="p-1 rounded hover:bg-gray-700/50 transition-colors"
              title="Export audit entry"
            >
              <ArrowDownTrayIcon className="w-3.5 h-3.5 text-gray-500" />
            </button>
          )}
        </div>
      </div>
      
      {message.expanded && (
        <div className="mt-3 pt-3 border-t border-gray-700/50">
          <div className="space-y-2 text-xs">
            <div className="flex">
              <span className="text-gray-500 w-24">Operation:</span>
              <span className="text-gray-300">{message.audit.operation}</span>
            </div>
            <div className="flex">
              <span className="text-gray-500 w-24">User:</span>
              <span className="text-gray-300">{message.audit.user}</span>
            </div>
            <div className="flex">
              <span className="text-gray-500 w-24">Timestamp:</span>
              <span className="text-gray-300">
                {new Date(message.audit.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="flex">
              <span className="text-gray-500 w-24">Status:</span>
              <span className={message.audit.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                {message.audit.status}
              </span>
            </div>
            
            {Object.keys(message.audit.details).length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-700/50">
                <div className="text-gray-500 mb-1">Details:</div>
                <pre className="text-gray-300 bg-gray-900/50 p-2 rounded overflow-x-auto">
                  {JSON.stringify(message.audit.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}