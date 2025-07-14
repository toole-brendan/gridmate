import React from 'react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { ChatBubbleLeftIcon, SparklesIcon } from '@heroicons/react/24/outline'

export type AutonomyMode = 'ask' | 'agent-default' | 'agent-yolo'

interface AutonomyModeSelectorProps {
  currentMode: AutonomyMode
  onModeChange: (mode: AutonomyMode) => void
  className?: string
}

const AUTONOMY_MODES = [
  {
    id: 'ask' as AutonomyMode,
    name: 'Ask',
    icon: ChatBubbleLeftIcon,
    description: 'Read-only mode. AI can answer questions but cannot make changes.',
    shortDescription: 'Read-only access'
  },
  {
    id: 'agent-default' as AutonomyMode,
    name: 'Agent',
    icon: SparklesIcon,
    description: 'AI can suggest changes but requires your approval before applying.',
    shortDescription: 'Requires approval'
  },
  {
    id: 'agent-yolo' as AutonomyMode,
    name: 'Agent (Auto-apply)',
    icon: SparklesIcon,
    description: 'AI automatically applies all changes without asking for approval.',
    shortDescription: 'Auto-apply changes',
    badge: 'YOLO'
  }
]

export const AutonomyModeSelector: React.FC<AutonomyModeSelectorProps> = ({
  currentMode,
  onModeChange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const currentModeConfig = AUTONOMY_MODES.find(mode => mode.id === currentMode) || AUTONOMY_MODES[0]

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <currentModeConfig.icon className="w-4 h-4 text-gray-500" />
        <span>{currentModeConfig.name}</span>
        {currentModeConfig.badge && (
          <span className="px-1.5 py-0.5 text-xs font-semibold text-orange-700 bg-orange-100 rounded">
            {currentModeConfig.badge}
          </span>
        )}
        <ChevronDownIcon className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-80 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {AUTONOMY_MODES.map((mode) => {
              const Icon = mode.icon
              const isSelected = mode.id === currentMode
              
              return (
                <button
                  key={mode.id}
                  onClick={() => {
                    onModeChange(mode.id)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                  role="menuitem"
                >
                  <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    isSelected ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        isSelected ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {mode.name}
                      </span>
                      {mode.badge && (
                        <span className="px-1.5 py-0.5 text-xs font-semibold text-orange-700 bg-orange-100 rounded">
                          {mode.badge}
                        </span>
                      )}
                    </div>
                    <p className={`mt-0.5 text-xs ${
                      isSelected ? 'text-blue-700' : 'text-gray-500'
                    }`}>
                      {mode.description}
                    </p>
                  </div>
                  {isSelected && (
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
          
          <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
            <p className="text-xs text-gray-600">
              <span className="font-medium">Tip:</span> Use keyboard shortcut{' '}
              <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-200 rounded">⌘.</kbd> to quickly switch modes
            </p>
          </div>
        </div>
      )}
    </div>
  )
}