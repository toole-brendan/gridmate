import React, { useEffect, useState } from 'react'
import { StatusMessage } from '../../../types/enhanced-chat'
import { 
  CogIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ServerIcon
} from '@heroicons/react/24/outline'

interface StatusIndicatorProps {
  message: StatusMessage
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ message }) => {
  const [dots, setDots] = useState('')
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    if (message.animated && ['thinking', 'processing', 'generating'].includes(message.status.type)) {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.')
      }, 500)
      return () => clearInterval(interval)
    }
  }, [message.animated, message.status.type])

  useEffect(() => {
    if (message.status.type === 'thinking') {
      const startTime = Date.now()
      const interval = setInterval(() => {
        setElapsedTime((Date.now() - startTime) / 1000)
      }, 100)
      return () => clearInterval(interval)
    }
  }, [message.status.type])

  const getIcon = () => {
    const baseClasses = "w-4 h-4"
    switch (message.status.type) {
      case 'thinking':
        return (
          <div className="relative">
            <CogIcon className={`${baseClasses} text-blue-400 animate-spin`} />
            <div className="absolute inset-0 blur-md bg-blue-400/30 animate-pulse" />
          </div>
        )
      case 'processing':
        return <CogIcon className={`${baseClasses} text-blue-400 animate-pulse`} />
      case 'executing':
        return <ServerIcon className={`${baseClasses} text-orange-400 animate-pulse`} />
      case 'generating':
        return (
          <div className="relative">
            <SparklesIcon className={`${baseClasses} text-purple-400 animate-pulse`} />
            <div className="absolute inset-0 blur-sm bg-purple-400/20 animate-pulse" />
          </div>
        )
      case 'searching':
        return <MagnifyingGlassIcon className={`${baseClasses} text-cyan-400 animate-pulse`} />
      case 'analyzing':
        return <DocumentTextIcon className={`${baseClasses} text-indigo-400 animate-pulse`} />
      case 'error':
        return <ExclamationTriangleIcon className={`${baseClasses} text-red-400`} />
      case 'info':
        return <InformationCircleIcon className={`${baseClasses} text-gray-400`} />
      case 'success':
        return <CheckCircleIcon className={`${baseClasses} text-green-400`} />
      default:
        return <CheckCircleIcon className={`${baseClasses} text-green-400`} />
    }
  }

  const getTextColor = () => {
    switch (message.status.type) {
      case 'error': return 'text-red-300'
      case 'info': return 'text-gray-300'
      default: return 'text-gray-400'
    }
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`
    return `${seconds.toFixed(1)}s`
  }

  const renderSubSteps = () => {
    if (!message.status.subSteps || message.status.subSteps.length === 0) return null
    
    return (
      <div className="mt-2 ml-6 space-y-1">
        {message.status.subSteps.map((step, index) => (
          <div key={index} className="flex items-center space-x-2 text-xs">
            <div className="w-1.5 h-1.5 rounded-full" style={{
              backgroundColor: step.status === 'completed' ? '#10b981' :
                             step.status === 'active' ? '#3b82f6' :
                             step.status === 'failed' ? '#ef4444' : '#6b7280'
            }} />
            <span className={`
              ${step.status === 'active' ? 'text-blue-400' : 'text-gray-500'}
              ${step.status === 'completed' ? 'line-through' : ''}
            `}>
              {step.name}
            </span>
            {step.duration && (
              <span className="text-gray-600">({formatDuration(step.duration / 1000)})</span>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="py-2">
      <div className="flex items-center space-x-2">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="flex-1">
          <span className={`text-sm ${getTextColor()}`}>
            {message.status.message}
            {message.animated && dots}
          </span>
          
          {message.status.details && (
            <div className="text-xs text-gray-500 mt-0.5">{message.status.details}</div>
          )}
          
          {message.status.type === 'thinking' && elapsedTime > 0 && (
            <div className="text-xs text-gray-500 mt-0.5">
              ⏱️ Thought for {formatDuration(elapsedTime)}
            </div>
          )}
          
          {message.status.duration && message.status.type !== 'thinking' && (
            <div className="text-xs text-gray-500 mt-0.5">
              ✓ Completed in {formatDuration(message.status.duration / 1000)}
            </div>
          )}
        </div>
        
        {message.status.progress !== undefined && (
          <div className="flex items-center space-x-2">
            <div className="w-24 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${message.status.progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{message.status.progress}%</span>
          </div>
        )}
      </div>
      
      {renderSubSteps()}
    </div>
  )
}