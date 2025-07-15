import React, { useState, useRef, useEffect } from 'react'
import { MentionAutocomplete, MentionItem } from './MentionAutocomplete'

interface MentionableTextareaProps {
  value: string
  onChange: (value: string) => void
  onKeyPress?: (e: React.KeyboardEvent) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  placeholder?: string
  disabled?: boolean
  rows?: number
  availableMentions: MentionItem[]
  onMentionSelect?: (mention: MentionItem) => void
  className?: string
}

export const MentionableTextarea: React.FC<MentionableTextareaProps> = ({
  value,
  onChange,
  onKeyPress,
  onKeyDown,
  placeholder,
  disabled,
  rows = 2,
  availableMentions,
  onMentionSelect,
  className = ''
}) => {
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionPosition, setMentionPosition] = useState({ x: 0, y: 0 })
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Parse mentions in text for highlighting
  const parseMentions = (text: string): Array<{ type: 'text' | 'mention', value: string }> => {
    const parts: Array<{ type: 'text' | 'mention', value: string }> = []
    const mentionRegex = /@(\w+)/g
    let lastIndex = 0
    let match
    
    while ((match = mentionRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', value: text.slice(lastIndex, match.index) })
      }
      parts.push({ type: 'mention', value: match[0] })
      lastIndex = match.index + match[0].length
    }
    
    if (lastIndex < text.length) {
      parts.push({ type: 'text', value: text.slice(lastIndex) })
    }
    
    return parts
  }
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const cursorPosition = e.target.selectionStart
    
    // Check if we're typing a mention
    const beforeCursor = newValue.slice(0, cursorPosition)
    const lastAtIndex = beforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1 && lastAtIndex === cursorPosition - 1) {
      // Just typed @
      setShowAutocomplete(true)
      setMentionSearch('')
      setMentionStartIndex(lastAtIndex)
      
      // Calculate position for autocomplete - position above the textarea
      if (textareaRef.current) {
        setMentionPosition({
          x: 0, // Will be relative to container
          y: -310 // Position above with space for max height (300px) + padding
        })
      }
    } else if (showAutocomplete && mentionStartIndex !== -1) {
      // Currently in mention mode
      const searchText = newValue.slice(mentionStartIndex + 1, cursorPosition)
      
      // Check if we've exited mention mode (space, punctuation, etc.)
      if (searchText.includes(' ') || searchText.includes('\n')) {
        setShowAutocomplete(false)
        setMentionStartIndex(-1)
      } else {
        setMentionSearch(searchText)
      }
    }
    
    onChange(newValue)
  }
  
  const handleMentionSelect = (item: MentionItem) => {
    if (textareaRef.current && mentionStartIndex !== -1) {
      const before = value.slice(0, mentionStartIndex)
      const after = value.slice(textareaRef.current.selectionStart)
      const newValue = before + item.value + ' ' + after
      
      onChange(newValue)
      
      // Set cursor position after the mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = mentionStartIndex + item.value.length + 1
          textareaRef.current.setSelectionRange(newPosition, newPosition)
          textareaRef.current.focus()
        }
      }, 0)
      
      setShowAutocomplete(false)
      setMentionStartIndex(-1)
      setMentionSearch('')
      
      onMentionSelect?.(item)
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showAutocomplete) {
      // Only intercept navigation keys when autocomplete is shown
      if (['ArrowUp', 'ArrowDown', 'Tab'].includes(e.key)) {
        e.preventDefault()
        return
      }
      // Only intercept Enter when autocomplete is shown
      if (e.key === 'Enter') {
        e.preventDefault()
        return
      }
    }
    
    if (e.key === 'Escape' && showAutocomplete) {
      setShowAutocomplete(false)
      setMentionStartIndex(-1)
      setMentionSearch('')
      return
    }
    
    // Call parent's onKeyDown if provided
    onKeyDown?.(e)
  }
  
  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showAutocomplete && !textareaRef.current?.contains(e.target as Node)) {
        setShowAutocomplete(false)
        setMentionStartIndex(-1)
        setMentionSearch('')
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAutocomplete])
  
  return (
    <div className="relative">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onKeyPress={onKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={`
            ${className}
            ${showAutocomplete ? 'ring-2 ring-blue-500' : ''}
          `}
          style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
        />
        
        {/* Mention highlight overlay (optional, for visual feedback) */}
        {value.includes('@') && (
          <div className="absolute inset-0 pointer-events-none p-3 overflow-hidden">
            <div className="font-mono text-sm text-transparent whitespace-pre-wrap break-words">
              {parseMentions(value).map((part, index) => (
                <span
                  key={index}
                  className={part.type === 'mention' ? 'bg-blue-500/20 rounded' : ''}
                >
                  {part.value}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {showAutocomplete && (
        <MentionAutocomplete
          searchTerm={mentionSearch}
          onSelect={handleMentionSelect}
          onClose={() => {
            setShowAutocomplete(false)
            setMentionStartIndex(-1)
            setMentionSearch('')
          }}
          position={mentionPosition}
          availableItems={availableMentions}
        />
      )}
    </div>
  )
}