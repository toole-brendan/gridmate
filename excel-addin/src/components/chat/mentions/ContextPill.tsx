import React from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

export interface ContextItem {
  id: string
  type: 'sheet' | 'range' | 'filter' | 'selection'
  label: string
  value: string
  removable?: boolean
}

interface ContextPillProps {
  item: ContextItem
  onRemove?: (id: string) => void
}

export const ContextPill: React.FC<ContextPillProps> = ({ item, onRemove }) => {
  const getIcon = () => {
    switch (item.type) {
      case 'sheet':
        return '📊'
      case 'range':
        return '📍'
      case 'filter':
        return '🔍'
      case 'selection':
        return '🎯'
      default:
        return '📌'
    }
  }
  
  const getTypeColor = () => {
    switch (item.type) {
      case 'sheet':
        return 'bg-blue-900/30 text-blue-400 border-blue-500/50'
      case 'range':
        return 'bg-green-900/30 text-green-400 border-green-500/50'
      case 'filter':
        return 'bg-purple-900/30 text-purple-400 border-purple-500/50'
      case 'selection':
        return 'bg-orange-900/30 text-orange-400 border-orange-500/50'
      default:
        return 'bg-gray-700/30 text-gray-400 border-gray-500/50'
    }
  }
  
  return (
    <div className={`
      inline-flex items-center space-x-1.5 px-2 py-1 rounded-full text-xs
      border transition-all duration-200 ${getTypeColor()}
      ${item.removable ? 'pr-1' : ''}
    `}>
      <span>{getIcon()}</span>
      <span className="font-medium">{item.label}:</span>
      <span className="opacity-80">{item.value}</span>
      
      {item.removable && onRemove && (
        <button
          onClick={() => onRemove(item.id)}
          className="ml-1 p-0.5 rounded-full hover:bg-white/10 transition-colors"
          title="Remove context"
        >
          <XMarkIcon className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

interface ContextPillsContainerProps {
  items: ContextItem[]
  onRemove?: (id: string) => void
  className?: string
}

export const ContextPillsContainer: React.FC<ContextPillsContainerProps> = ({
  items,
  onRemove,
  className = ''
}) => {
  if (items.length === 0) return null
  
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {items.map(item => (
        <ContextPill
          key={item.id}
          item={item}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}