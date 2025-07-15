import React, { useState, useEffect, useRef } from 'react'
import { 
  DocumentIcon,
  TableCellsIcon,
  ChartBarIcon,
  Square3Stack3DIcon,
  HashtagIcon,
  CursorArrowRaysIcon
} from '@heroicons/react/24/outline'

export interface MentionItem {
  id: string
  type: 'sheet' | 'range' | 'table' | 'chart' | 'namedRange' | 'selection' | 'workbook'
  label: string
  value: string
  description?: string
  icon?: React.ReactNode
}

interface MentionAutocompleteProps {
  searchTerm: string
  onSelect: (item: MentionItem) => void
  onClose: () => void
  position: { x: number; y: number }
  availableItems: MentionItem[]
}

export const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  searchTerm,
  onSelect,
  onClose,
  position,
  availableItems
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Filter items based on search term
  const filteredItems = availableItems.filter(item =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.value.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  // Default items when no search term
  const defaultItems: MentionItem[] = [
    {
      id: 'current-selection',
      type: 'selection',
      label: 'CurrentSelection',
      value: '@CurrentSelection',
      description: 'Currently selected cells',
      icon: <CursorArrowRaysIcon className="w-4 h-4" />
    },
    {
      id: 'active-sheet',
      type: 'sheet',
      label: 'ActiveSheet',
      value: '@ActiveSheet',
      description: 'Current worksheet',
      icon: <DocumentIcon className="w-4 h-4" />
    },
    {
      id: 'all-sheets',
      type: 'sheet',
      label: 'AllSheets',
      value: '@AllSheets',
      description: 'All worksheets in workbook',
      icon: <Square3Stack3DIcon className="w-4 h-4" />
    },
    {
      id: 'formulas',
      type: 'range',
      label: 'Formulas',
      value: '@Formulas',
      description: 'All formulas in sheet',
      icon: <HashtagIcon className="w-4 h-4" />
    }
  ]
  
  const displayItems = searchTerm ? filteredItems : [...defaultItems, ...availableItems.slice(0, 5)]
  
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchTerm])
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => (prev + 1) % displayItems.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => (prev - 1 + displayItems.length) % displayItems.length)
          break
        case 'Enter':
          e.preventDefault()
          if (displayItems[selectedIndex]) {
            onSelect(displayItems[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        case 'Tab':
          e.preventDefault()
          if (displayItems[selectedIndex]) {
            onSelect(displayItems[selectedIndex])
          }
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [displayItems, selectedIndex, onSelect, onClose])
  
  useEffect(() => {
    // Ensure selected item is visible
    if (containerRef.current && selectedIndex >= 0) {
      const items = containerRef.current.querySelectorAll('[data-mention-item]')
      const selectedItem = items[selectedIndex] as HTMLElement
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])
  
  const getIcon = (item: MentionItem) => {
    if (item.icon) return item.icon
    
    switch (item.type) {
      case 'sheet':
        return <DocumentIcon className="w-4 h-4" />
      case 'range':
        return <TableCellsIcon className="w-4 h-4" />
      case 'table':
        return <TableCellsIcon className="w-4 h-4" />
      case 'chart':
        return <ChartBarIcon className="w-4 h-4" />
      case 'namedRange':
        return <HashtagIcon className="w-4 h-4" />
      case 'selection':
        return <CursorArrowRaysIcon className="w-4 h-4" />
      case 'workbook':
        return <Square3Stack3DIcon className="w-4 h-4" />
      default:
        return <DocumentIcon className="w-4 h-4" />
    }
  }
  
  if (displayItems.length === 0) {
    return (
      <div
        className="absolute z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-3"
        style={{ left: position.x, top: position.y }}
      >
        <p className="text-sm text-gray-400">No matches found</p>
      </div>
    )
  }
  
  return (
    <div
      ref={containerRef}
      className="absolute z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden"
      style={{ left: position.x, top: position.y, maxHeight: '300px', minWidth: '250px' }}
    >
      <div className="p-1">
        {displayItems.map((item, index) => (
          <button
            key={item.id}
            data-mention-item
            onClick={() => onSelect(item)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={`
              w-full flex items-center space-x-2 px-3 py-2 rounded-md text-left
              transition-colors duration-100
              ${index === selectedIndex ? 'bg-blue-600/20 text-blue-300' : 'hover:bg-gray-700/50 text-gray-300'}
            `}
          >
            <div className="flex-shrink-0 text-gray-400">
              {getIcon(item)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{item.label}</div>
              {item.description && (
                <div className="text-xs text-gray-500 truncate">{item.description}</div>
              )}
            </div>
            {index === selectedIndex && (
              <div className="flex-shrink-0">
                <kbd className="text-xs bg-gray-700 px-1 py-0.5 rounded">↵</kbd>
              </div>
            )}
          </button>
        ))}
      </div>
      
      <div className="border-t border-gray-700 px-3 py-2 bg-gray-900/50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Cancel</span>
        </div>
      </div>
    </div>
  )
}