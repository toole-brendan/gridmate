import React from 'react'

interface ContextChipProps {
  label: string
  value: string
  icon?: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
}

export const ContextChip: React.FC<ContextChipProps> = ({ 
  label, 
  value, 
  icon,
  className = '',
  onClick,
  disabled = false
}) => {
  // Don't render if value is empty
  if (!value || value.trim() === '') {
    return null
  }

  const isClickable = onClick !== undefined

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
        isClickable 
          ? disabled 
            ? 'bg-gray-800/20 border border-gray-700/30 cursor-pointer opacity-50' 
            : 'bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800/70 cursor-pointer'
          : 'bg-gray-800/50 border border-gray-700/50 cursor-default'
      } ${className}`}
    >
      {icon && (
        <span className={disabled ? "text-gray-600" : "text-gray-400"}>
          {icon}
        </span>
      )}
      <span className={disabled ? "text-gray-600" : "text-gray-500"}>{label}:</span>
      <span className={disabled ? "text-gray-500 font-medium" : "text-gray-200 font-medium"}>{value}</span>
    </button>
  )
}