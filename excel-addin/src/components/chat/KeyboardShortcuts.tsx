import React, { useEffect, useCallback } from 'react'

export interface ShortcutHandler {
  key: string
  ctrlOrCmd?: boolean
  shift?: boolean
  alt?: boolean
  description: string
  handler: () => void
  enabled?: boolean
}

interface KeyboardShortcutsProps {
  shortcuts: ShortcutHandler[]
  children?: React.ReactNode
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ shortcuts, children }) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const activeElement = document.activeElement
    const isInputActive = activeElement?.tagName === 'INPUT' || 
                         activeElement?.tagName === 'TEXTAREA' ||
                         activeElement?.getAttribute('contenteditable') === 'true'
    
    for (const shortcut of shortcuts) {
      if (shortcut.enabled === false) continue
      
      const modifierMatch = 
        (!shortcut.ctrlOrCmd || (e.metaKey || e.ctrlKey)) &&
        (!shortcut.shift || e.shiftKey) &&
        (!shortcut.alt || e.altKey)
      
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()
      
      if (modifierMatch && keyMatch) {
        // Some shortcuts should work even in inputs
        const allowInInput = ['Escape', 'Enter'].includes(shortcut.key) || shortcut.ctrlOrCmd
        
        if (!isInputActive || allowInInput) {
          e.preventDefault()
          e.stopPropagation()
          shortcut.handler()
          break
        }
      }
    }
  }, [shortcuts])
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
  
  return <>{children}</>
}

// Keyboard shortcuts help overlay component
interface ShortcutsHelpOverlayProps {
  isOpen: boolean
  onClose: () => void
  shortcuts: ShortcutHandler[]
}

export const ShortcutsHelpOverlay: React.FC<ShortcutsHelpOverlayProps> = ({ 
  isOpen, 
  onClose, 
  shortcuts 
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])
  
  if (!isOpen) return null
  
  const formatKey = (shortcut: ShortcutHandler): string => {
    const parts: string[] = []
    
    if (shortcut.ctrlOrCmd) {
      parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
    }
    if (shortcut.shift) parts.push('⇧')
    if (shortcut.alt) parts.push('⌥')
    
    // Format special keys
    const keyDisplay = shortcut.key === ' ' ? 'Space' : 
                      shortcut.key === 'ArrowUp' ? '↑' :
                      shortcut.key === 'ArrowDown' ? '↓' :
                      shortcut.key === 'ArrowLeft' ? '←' :
                      shortcut.key === 'ArrowRight' ? '→' :
                      shortcut.key.toUpperCase()
    
    parts.push(keyDisplay)
    
    return parts.join(' ')
  }
  
  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.description.includes('Navigate') ? 'Navigation' :
                    shortcut.description.includes('Approve') || shortcut.description.includes('Reject') ? 'Actions' :
                    shortcut.description.includes('Focus') || shortcut.description.includes('Clear') ? 'Input' :
                    shortcut.description.includes('Mode') || shortcut.description.includes('autonomy') ? 'Modes' :
                    'Other'
    
    if (!acc[category]) acc[category] = []
    acc[category].push(shortcut)
    return acc
  }, {} as Record<string, ShortcutHandler[]>)
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-100">Keyboard Shortcuts</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 transition-colors"
            >
              <kbd className="text-xs bg-gray-700 px-2 py-1 rounded">ESC</kbd>
            </button>
          </div>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-100px)]">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 mb-3">{category}</h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between px-3 py-2 rounded hover:bg-gray-700/50 transition-colors"
                  >
                    <span className="text-sm text-gray-300">{shortcut.description}</span>
                    <kbd className="text-xs bg-gray-700 px-2 py-1 rounded font-mono text-gray-400">
                      {formatKey(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-gray-700 bg-gray-900/50">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="bg-gray-700 px-1.5 py-0.5 rounded">?</kbd> anytime to show this help
          </p>
        </div>
      </div>
    </div>
  )
}