import React from 'react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { ChatBubbleLeftIcon, SparklesIcon } from '@heroicons/react/24/outline'

export type AutonomyMode = 'ask' | 'agent-default' | 'agent-yolo'

interface CompactAutonomySelectorProps {
  currentMode: AutonomyMode
  onModeChange: (mode: AutonomyMode) => void
}

const AUTONOMY_MODES = [
  {
    id: 'ask' as AutonomyMode,
    name: 'Ask',
    icon: ChatBubbleLeftIcon,
    description: 'Read-only mode',
    color: 'text-gray-600'
  },
  {
    id: 'agent-default' as AutonomyMode,
    name: 'Agent',
    icon: SparklesIcon,
    description: 'Requires approval',
    color: 'text-blue-600'
  },
  {
    id: 'agent-yolo' as AutonomyMode,
    name: 'Agent',
    icon: SparklesIcon,
    description: 'Auto-apply',
    badge: '∞',
    color: 'text-orange-600'
  }
]

export const CompactAutonomySelector: React.FC<CompactAutonomySelectorProps> = ({
  currentMode,
  onModeChange
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

  return (
    <div ref={dropdownRef} className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 rounded border border-gray-300 transition-all"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <currentModeConfig.icon className={`w-3 h-3 ${currentModeConfig.color}`} />
        <span className="text-gray-600">
          {currentModeConfig.name}
          {currentModeConfig.badge && (
            <span className="ml-0.5 font-normal text-gray-500">{currentModeConfig.badge}</span>
          )}
        </span>
        <ChevronDownIcon className="w-2.5 h-2.5 text-gray-400 ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
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
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                  role="menuitem"
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${mode.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-medium ${
                        isSelected ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {mode.name}
                        {mode.badge && (
                          <span className="ml-1 text-xs">{mode.badge}</span>
                        )}
                      </span>
                    </div>
                    <p className={`text-xs ${
                      isSelected ? 'text-blue-700' : 'text-gray-500'
                    }`}>
                      {mode.description}
                    </p>
                  </div>
                  {isSelected && (
                    <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
          
          <div className="border-t border-gray-200 px-3 py-2 bg-gray-50">
            <p className="text-xs text-gray-600">
              <kbd className="px-1 py-0.5 text-xs font-mono bg-gray-200 rounded">⌘.</kbd> to switch modes
            </p>
          </div>
        </div>
      )}
    </div>
  )
}