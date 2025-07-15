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
    color: 'text-[#0066CC]',
    bgColor: 'bg-transparent',
    borderColor: 'border-[#0066CC]'
  },
  {
    mode: 'agent-default',
    label: 'Default Mode',
    shortLabel: 'Default',
    description: 'AI suggests changes, requires your approval',
    icon: CpuChipIcon,
    color: 'text-[#0066CC]',
    bgColor: 'bg-transparent',
    borderColor: 'border-[#0066CC]'
  },
  {
    mode: 'agent-yolo',
    label: 'YOLO Mode',
    shortLabel: 'YOLO',
    description: 'AI applies changes automatically',
    icon: BoltIcon,
    color: 'text-[#0066CC]',
    bgColor: 'bg-transparent',
    borderColor: 'border-[#0066CC]',
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
          inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-caption
          ${currentConfig.bgColor} ${currentConfig.borderColor}
          border transition-all duration-150
          hover:border-text-secondary
          ${isOpen ? 'ring-2 ring-offset-1 ring-offset-app-background ' + currentConfig.color.replace('text', 'ring') : ''}
        `}
      >
        <CurrentIcon className={`w-3 h-3 ${currentConfig.color}`} />
        <span className={`uppercase ${currentConfig.color}`}>
          {currentConfig.shortLabel}
        </span>
        <ChevronDownIcon className={`w-3 h-3 ${currentConfig.color} transition-transform rotate-180 ${isOpen ? 'rotate-0' : ''}`} />
      </button>
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 animate-fadeIn">
          <div className="bg-app-background text-text-primary text-xs px-2 py-1 rounded-md shadow-ios whitespace-nowrap border border-border-primary">
            Mode changed to {currentConfig.label}
          </div>
        </div>
      )}
      
      {/* Dropdown - Always opens upward */}
      {isOpen && (
        <div 
          className="absolute left-0 bottom-full mb-2 w-72 bg-app-background border border-border-primary rounded-lg shadow-ios animate-slideUp"
        >
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
                    ${isSelected ? config.bgColor + ' ' + config.borderColor + ' border' : 'hover:bg-secondary-background'}
                  `}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${isSelected ? config.color : 'text-text-primary'}`}>
                        {config.label}
                      </span>
                      {isSelected && (
                        <CheckIcon className={`w-4 h-4 ${config.color}`} />
                      )}
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">
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
          
          <div className="border-t border-border-primary px-3 py-2">
            <div className="flex items-center justify-between text-xs text-text-tertiary">
              <span>Keyboard shortcut</span>
              <kbd className="px-1.5 py-0.5 bg-secondary-background rounded text-text-secondary font-caption">
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