import React from 'react'
import { Sparkles } from 'lucide-react'

interface SuggestionChipsProps {
  suggestions: string[]
  onSuggestionClick: (suggestion: string) => void
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({
  suggestions,
  onSuggestionClick
}) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSuggestionClick(suggestion)}
          className="group flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-wendigo-accent/10 hover:text-wendigo-accent dark:hover:text-wendigo-accent transition-colors"
        >
          <Sparkles className="w-3 h-3 opacity-50 group-hover:opacity-100" />
          <span>{suggestion}</span>
        </button>
      ))}
    </div>
  )
}