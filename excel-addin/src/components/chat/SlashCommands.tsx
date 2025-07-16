import React, { useState, useEffect } from 'react'
import { 
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  QuestionMarkCircleIcon,
  CommandLineIcon,
  ClockIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'

export interface SlashCommand {
  command: string
  description: string
  icon?: React.ReactNode
  handler: () => void
  category?: string
}

interface SlashCommandsProps {
  commands: SlashCommand[]
  isVisible: boolean
  searchTerm: string
  onSelect: (command: SlashCommand) => void
  onClose: () => void
  position?: { x: number; y: number }
}

export const SlashCommands: React.FC<SlashCommandsProps> = ({
  commands,
  isVisible,
  searchTerm,
  onSelect,
  onClose,
  position = { x: 0, y: 0 }
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  
  // Filter commands based on search
  const filteredCommands = searchTerm
    ? commands.filter(cmd => 
        cmd.command.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cmd.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : commands
  
  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    const category = cmd.category || 'General'
    if (!acc[category]) acc[category] = []
    acc[category].push(cmd)
    return acc
  }, {} as Record<string, SlashCommand[]>)
  
  // Flatten for keyboard navigation
  const flatCommands = Object.values(groupedCommands).flat()
  
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchTerm])
  
  useEffect(() => {
    if (!isVisible) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => (prev + 1) % flatCommands.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => (prev - 1 + flatCommands.length) % flatCommands.length)
          break
        case 'Enter':
          e.preventDefault()
          if (flatCommands[selectedIndex]) {
            onSelect(flatCommands[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, flatCommands, selectedIndex, onSelect, onClose])
  
  if (!isVisible || filteredCommands.length === 0) return null
  
  let commandIndex = 0
  
  return (
    <div
      className="absolute z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden"
      style={{ 
        left: position.x, 
        bottom: position.y,
        maxHeight: '300px',
        minWidth: '280px'
      }}
    >
      <div className="p-2">
        {Object.entries(groupedCommands).map(([category, categoryCommands]) => (
          <div key={category} className="mb-2">
            {Object.keys(groupedCommands).length > 1 && (
              <div className="text-xs text-gray-500 px-2 py-1 font-medium">{category}</div>
            )}
            {categoryCommands.map((cmd) => {
              const currentIndex = commandIndex++
              return (
                <button
                  key={cmd.command}
                  onClick={() => onSelect(cmd)}
                  onMouseEnter={() => setSelectedIndex(currentIndex)}
                  className={`
                    w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left
                    transition-colors duration-100
                    ${currentIndex === selectedIndex ? 'bg-blue-600/20 text-blue-300' : 'hover:bg-gray-700/50 text-gray-300'}
                  `}
                >
                  <div className="flex-shrink-0 text-gray-400">
                    {cmd.icon || <CommandLineIcon className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">/{cmd.command}</div>
                    <div className="text-xs text-gray-500">{cmd.description}</div>
                  </div>
                  {currentIndex === selectedIndex && (
                    <kbd className="text-xs bg-gray-700 px-1 py-0.5 rounded">↵</kbd>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      
      <div className="border-t border-gray-700 px-3 py-2 bg-gray-900/50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Type to filter</span>
          <span>↑↓ Navigate • ↵ Select</span>
        </div>
      </div>
    </div>
  )
}

// Default slash commands
export const defaultSlashCommands: SlashCommand[] = [
  {
    command: 'undo',
    description: 'Undo last operation',
    icon: <ArrowUturnLeftIcon className="w-4 h-4" />,
    handler: () => console.log('Undo command'),
    category: 'Actions'
  },
  {
    command: 'redo',
    description: 'Redo last operation',
    icon: <ArrowUturnRightIcon className="w-4 h-4" />,
    handler: () => console.log('Redo command'),
    category: 'Actions'
  },
  {
    command: 'clear',
    description: 'Clear chat history',
    icon: <TrashIcon className="w-4 h-4" />,
    handler: () => console.log('Clear command'),
    category: 'Chat'
  },
  {
    command: 'copy',
    description: 'Copy last response',
    icon: <DocumentDuplicateIcon className="w-4 h-4" />,
    handler: () => console.log('Copy command'),
    category: 'Chat'
  },
  {
    command: 'help',
    description: 'Show available commands',
    icon: <QuestionMarkCircleIcon className="w-4 h-4" />,
    handler: () => console.log('Help command'),
    category: 'Help'
  },
  {
    command: 'history',
    description: 'Show command history',
    icon: <ClockIcon className="w-4 h-4" />,
    handler: () => console.log('History command'),
    category: 'Chat'
  },
  {
    command: 'export',
    description: 'Export chat as markdown',
    icon: <DocumentArrowDownIcon className="w-4 h-4" />,
    handler: () => console.log('Export command'),
    category: 'Chat'
  }
]

// Hook to handle slash command input
export const useSlashCommands = (
  input: string,
  setInput: (value: string) => void
) => {
  const [showCommands, setShowCommands] = useState(false)
  const [commandSearch, setCommandSearch] = useState('')
  
  useEffect(() => {
    // Check if we're typing a slash command
    if (input.startsWith('/') && !input.includes(' ') && !input.includes('\n')) {
      setShowCommands(true)
      setCommandSearch(input.slice(1))
    } else {
      setShowCommands(false)
      setCommandSearch('')
    }
  }, [input])
  
  const handleCommandSelect = (command: SlashCommand) => {
    // Execute the command
    command.handler()
    
    // Clear the input
    setInput('')
    
    // Hide commands
    setShowCommands(false)
    setCommandSearch('')
  }
  
  return {
    showCommands,
    commandSearch,
    handleCommandSelect,
    closeCommands: () => {
      setShowCommands(false)
      setCommandSearch('')
    }
  }
}