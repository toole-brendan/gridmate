import React, { useState, useEffect } from 'react'
import { ToolSuggestionMessage } from '../../../types/enhanced-chat'
import { PencilIcon, ClockIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolidIcon, XCircleIcon as XCircleSolidIcon } from '@heroicons/react/24/solid'
import { ExcelDiffRenderer } from '../diff'
import { ChatMessageDiffPreview } from '../ChatMessageDiffPreview'

interface ToolSuggestionCardProps {
  message: ToolSuggestionMessage
  onApprove?: () => void
  onReject?: () => void
  onModify?: () => void
  diffData?: any
  onAcceptDiff?: () => Promise<void>
  onRejectDiff?: () => Promise<void>
}

export const ToolSuggestionCard: React.FC<ToolSuggestionCardProps> = ({
  message,
  onApprove,
  onReject,
  onModify,
  diffData,
  onAcceptDiff,
  onRejectDiff
}) => {
  // Filter out read_range tools
  if (message.tool.name === 'read_range') {
    return null;
  }
  const [isHovered, setIsHovered] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<string>('')

  useEffect(() => {
    if (message.expiresAt && message.status === 'pending') {
      const interval = setInterval(() => {
        const remaining = new Date(message.expiresAt!).getTime() - Date.now()
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



  const getStatusColor = () => {
    // Clean iOS-style card - all cards have same background
    switch (message.status) {
      case 'approved': return 'border-success'
      case 'rejected': return 'border-destructive'
      case 'expired': return 'border-border-primary'
      default: return 'border-primary'
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


  return (
    <div
      className={`bg-secondary-background border ${getStatusColor()} rounded-lg shadow-ios p-3 space-y-2 transition-all duration-150 ${
        isHovered && message.status === 'pending' ? 'shadow-elevated' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <PencilIcon className="w-4 h-4 text-text-secondary" />
            <span className="font-subhead text-text-primary">{message.tool.name}</span>
          </div>
          
          {message.status === 'pending' && timeRemaining && (
            <span className="font-caption text-text-tertiary flex items-center">
              <ClockIcon className="w-3 h-3 mr-1" />
              {timeRemaining}
            </span>
          )}

          {message.status === 'approved' && (
            <CheckCircleSolidIcon className="w-5 h-5 text-success" />
          )}
          
          {message.status === 'rejected' && (
            <XCircleSolidIcon className="w-5 h-5 text-destructive" />
          )}
        </div>

        {message.tool.preview && (
          <div className="mb-1">
            <ExcelDiffRenderer diff={message.tool.preview} />
          </div>
        )}

        {message.tool.parameters && message.tool.parameters.range && (
          <div className="font-mono text-xs text-text-secondary bg-app-background p-2 rounded-md">
            {message.tool.parameters.range}
          </div>
        )}

        {message.status === 'pending' && (
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleReject}
              className="px-3 py-1.5 rounded-md font-subhead text-destructive bg-secondary-background border border-border-primary hover:border-destructive transition-colors"
            >
              Reject
            </button>
            
            <button
              onClick={handleApprove}
              className="px-3 py-1.5 rounded-md font-subhead text-white bg-primary hover:bg-[#0059b3] transition-colors"
            >
              Accept
            </button>
          </div>
        )}

        {diffData && diffData.status === 'previewing' && onAcceptDiff && onRejectDiff && (
          <ChatMessageDiffPreview
            messageId={message.id}
            hunks={diffData.hunks}
            onAccept={onAcceptDiff}
            onReject={onRejectDiff}
            status={diffData.status}
          />
        )}

      </div>

    </div>
  )
}