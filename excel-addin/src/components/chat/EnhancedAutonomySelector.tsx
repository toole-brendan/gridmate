import React, { useState, useRef, useEffect } from 'react'
import { AutonomyMode } from './AutonomyModeSelector'
import { 
  EyeIcon, 
  CpuChipIcon, 
  BoltIcon,
  ChevronDownIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

interface EnhancedAutonomySelectorProps {
  currentMode: AutonomyMode
  onModeChange: (mode: AutonomyMode) => void
}

interface ModeConfig {
  mode: AutonomyMode
  label: string
  shortLabel: string
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
  warning?: string
}

const modeConfigs: ModeConfig[] = [
  {
    mode: 'ask',
    label: 'Read-only Mode',
    shortLabel: 'Ask',
    description: 'AI can only read and analyze, no changes',
    icon: EyeIcon,
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/20',
    borderColor: 'border-blue-500/50'
  },
  {
    mode: 'agent-default',
    label: 'Default Mode',
    shortLabel: 'Default',
    description: 'AI suggests changes, requires your approval',
    icon: CpuChipIcon,
    color: 'text-green-400',
    bgColor: 'bg-green-900/20',
    borderColor: 'border-green-500/50'
  },
  {
    mode: 'agent-yolo',
    label: 'YOLO Mode',
    shortLabel: 'YOLO',
    description: 'AI applies changes automatically',
    icon: BoltIcon,
    color: 'text-orange-400',
    bgColor: 'bg-orange-900/20',
    borderColor: 'border-orange-500/50',
    warning: 'Changes are applied immediately without approval'
  }
]

export const EnhancedAutonomySelector: React.FC<EnhancedAutonomySelectorProps> = ({
  currentMode,
  onModeChange
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()
  
  const currentConfig = modeConfigs.find(c => c.mode === currentMode) || modeConfigs[1]
  const CurrentIcon = currentConfig.icon
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const handleModeSelect = (mode: AutonomyMode) => {
    onModeChange(mode)
    setIsOpen(false)
    
    // Show brief confirmation
    setShowTooltip(true)
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setShowTooltip(false), 2000)
  }
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center space-x-2 px-3 py-1.5 rounded-lg
          ${currentConfig.bgColor} ${currentConfig.borderColor}
          border transition-all duration-200
          hover:bg-opacity-30 hover:shadow-lg
          ${isOpen ? 'ring-2 ring-offset-1 ring-offset-gray-900 ' + currentConfig.color.replace('text', 'ring') : ''}
        `}
      >
        <CurrentIcon className={`w-4 h-4 ${currentConfig.color}`} />
        <span className={`text-sm font-medium ${currentConfig.color}`}>
          {currentConfig.shortLabel}
        </span>
        <ChevronDownIcon className={`w-3 h-3 ${currentConfig.color} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 animate-fadeIn">
          <div className="bg-gray-800 text-gray-200 text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
            Mode changed to {currentConfig.label}
          </div>
        </div>
      )}
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl animate-slideUp">
          <div className="p-1">
            {modeConfigs.map((config) => {
              const Icon = config.icon
              const isSelected = config.mode === currentMode
              
              return (
                <button
                  key={config.mode}
                  onClick={() => handleModeSelect(config.mode)}
                  className={`
                    w-full flex items-start space-x-3 p-3 rounded-md
                    transition-all duration-150
                    ${isSelected ? config.bgColor + ' ' + config.borderColor + ' border' : 'hover:bg-gray-700/50'}
                  `}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${isSelected ? config.color : 'text-gray-200'}`}>
                        {config.label}
                      </span>
                      {isSelected && (
                        <CheckIcon className={`w-4 h-4 ${config.color}`} />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {config.description}
                    </p>
                    {config.warning && (
                      <div className="flex items-start space-x-1 mt-2">
                        <ShieldExclamationIcon className="w-3 h-3 text-orange-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-orange-400/80">
                          {config.warning}
                        </p>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
          
          <div className="border-t border-gray-700 px-3 py-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Keyboard shortcut</span>
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">
                {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + .
              </kbd>
            </div>
          </div>
        </div>
      )}
      
      {/* Mode indicator badge */}
      {currentMode === 'agent-yolo' && (
        <div className="absolute -top-1 -right-1">
          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
        </div>
      )}
      
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slideUp {
          animation: slideUp 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}