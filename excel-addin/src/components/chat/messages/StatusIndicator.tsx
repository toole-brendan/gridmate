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
        return <CogIcon className={`${baseClasses} text-primary animate-spin`} />
      case 'processing':
        return <CogIcon className={`${baseClasses} text-primary animate-pulse`} />
      case 'executing':
        return <ServerIcon className={`${baseClasses} text-warning animate-pulse`} />
      case 'generating':
        return <SparklesIcon className={`${baseClasses} text-primary animate-pulse`} />
      case 'searching':
        return <MagnifyingGlassIcon className={`${baseClasses} text-primary animate-pulse`} />
      case 'analyzing':
        return <DocumentTextIcon className={`${baseClasses} text-primary animate-pulse`} />
      case 'error':
        return <ExclamationTriangleIcon className={`${baseClasses} text-destructive`} />
      case 'info':
        return <InformationCircleIcon className={`${baseClasses} text-text-secondary`} />
      case 'success':
        return <CheckCircleIcon className={`${baseClasses} text-success`} />
      default:
        return <CheckCircleIcon className={`${baseClasses} text-success`} />
    }
  }

  const getTextColor = () => {
    switch (message.status.type) {
      case 'error': return 'text-destructive'
      case 'info': return 'text-text-secondary'
      default: return 'text-text-secondary'
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
          <div key={index} className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{
              backgroundColor: step.status === 'completed' ? 'var(--accent-success)' :
                             step.status === 'active' ? 'var(--accent-primary)' :
                             step.status === 'failed' ? 'var(--accent-destructive)' : 'var(--text-tertiary)'
            }} />
            <span className={`font-footnote
              ${step.status === 'active' ? 'text-primary' : 'text-text-tertiary'}
              ${step.status === 'completed' ? 'line-through' : ''}
            `}>
              {step.name}
            </span>
            {step.duration && (
              <span className="font-caption text-text-tertiary">({formatDuration(step.duration / 1000)})</span>
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
          <span className={`font-callout ${getTextColor()}`}>
            {message.status.message}
            {message.animated && dots}
          </span>
          
          {message.status.details && (
            <div className="font-footnote text-text-tertiary mt-0.5">{message.status.details}</div>
          )}
          
          
        </div>
        
        {message.status.progress !== undefined && (
          <div className="flex items-center space-x-2">
            <div className="w-24 h-1 bg-border-primary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${message.status.progress}%` }}
              />
            </div>
            <span className="font-caption text-text-tertiary">{message.status.progress}%</span>
          </div>
        )}
      </div>
      
      {renderSubSteps()}
    </div>
  )
}