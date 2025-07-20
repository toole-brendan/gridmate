import React from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

export interface ContextItem {
  id: string
  type: 'sheet' | 'range' | 'filter' | 'selection' | 'edit' | 'change'
  label: string
  value: string
  removable?: boolean
  metadata?: Record<string, any>  // Additional metadata for context items
}

interface ContextPillProps {
  item: ContextItem
  onRemove?: (id: string) => void
  onClick?: () => void
  isEnabled?: boolean
  isClickDisabled?: boolean
}

export const ContextPill: React.FC<ContextPillProps> = ({ item, onRemove, onClick, isEnabled = true, isClickDisabled = false }) => {
  const getIcon = () => {
    switch (item.type) {
      case 'sheet':
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
        )
      case 'range':
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        )
      case 'filter':
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        )
      case 'selection':
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )
      case 'edit':
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        )
      case 'change':
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        )
      default:
        return (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        )
    }
  }
  
  const getTypeStyles = () => {
    if (!isEnabled) {
      return 'bg-transparent text-[#B85500] border-[#B85500] opacity-50'
    }
    
    // Active state with orange accent
    return 'bg-transparent text-[#B85500] border-[#B85500] hover:border-[#D96600] hover:bg-[#B85500] hover:bg-opacity-10'
  }
  
  const Component = onClick && !isClickDisabled ? 'button' : 'div'
  
  const isNoSelection = item.id === 'no-selection'
  
  return (
    <Component
      onClick={onClick && !isClickDisabled ? onClick : undefined}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-caption border transition-all duration-150 ${onClick && !isClickDisabled ? 'cursor-pointer' : 'cursor-default'} ${getTypeStyles()}`}
    >
      {getIcon()}
      <span className={isNoSelection ? 'flex-grow text-center' : ''}>{item.label}</span>
      
      {item.removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove(item.id)
          }}
          className="ml-0.5 text-text-tertiary hover:text-text-primary transition-colors"
          title="Remove context"
        >
          <XMarkIcon className="w-3 h-3" />
        </button>
      )}
    </Component>
  )
}

interface ContextPillsContainerProps {
  items: ContextItem[]
  onRemove?: (id: string) => void
  onContextToggle?: () => void
  isContextEnabled?: boolean
  isToggleDisabled?: boolean
  className?: string
}

export const ContextPillsContainer: React.FC<ContextPillsContainerProps> = ({
  items,
  onRemove,
  onContextToggle,
  isContextEnabled = true,
  isToggleDisabled = false,
  className = ''
}) => {
  let displayItems: ContextItem[] = items;
  let pillsAreEnabled = isContextEnabled;
  let pillClickHandler: ((item: ContextItem) => (() => void) | undefined) = (item) => (item.type === 'selection' && !isToggleDisabled ? onContextToggle : undefined);

  const isPlaceholder = items.length === 0 || (items.length === 1 && items[0].id === 'no-selection');

  if (isPlaceholder) {
    displayItems = [{
      id: 'no-selection',
      type: 'selection',
      label: 'NO RANGE SELECTED',
      value: '',
      removable: false
    }];
    pillsAreEnabled = false;
    pillClickHandler = () => undefined;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {displayItems.map(item => (
        <ContextPill
          key={item.id}
          item={item}
          onRemove={pillsAreEnabled ? onRemove : undefined}
          onClick={pillClickHandler(item)}
          isEnabled={pillsAreEnabled}
          isClickDisabled={isToggleDisabled && item.type === 'selection'}
        />
      ))}
    </div>
  );
}