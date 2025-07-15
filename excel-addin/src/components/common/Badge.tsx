import React from 'react'
import { theme } from '../../utils/theme'

type BadgeVariant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'purple' | 'cyan'
type BadgeSize = 'sm' | 'md' | 'lg'

interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  children: React.ReactNode
  className?: string
  dot?: boolean
  outlined?: boolean
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  default: {
    bg: 'bg-gray-700/50',
    text: 'text-gray-300',
    border: 'border-gray-600'
  },
  success: {
    bg: 'bg-green-900/30',
    text: 'text-green-400',
    border: 'border-green-500/50'
  },
  error: {
    bg: 'bg-red-900/30',
    text: 'text-red-400',
    border: 'border-red-500/50'
  },
  warning: {
    bg: 'bg-yellow-900/30',
    text: 'text-yellow-400',
    border: 'border-yellow-500/50'
  },
  info: {
    bg: 'bg-blue-900/30',
    text: 'text-blue-400',
    border: 'border-blue-500/50'
  },
  purple: {
    bg: 'bg-purple-900/30',
    text: 'text-purple-400',
    border: 'border-purple-500/50'
  },
  cyan: {
    bg: 'bg-cyan-900/30',
    text: 'text-cyan-400',
    border: 'border-cyan-500/50'
  }
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-xs',
  lg: 'px-2.5 py-1.5 text-sm'
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className = '',
  dot,
  outlined
}) => {
  const { bg, text, border } = variantStyles[variant]
  
  const classes = [
    'inline-flex items-center gap-1 rounded-full font-medium transition-colors',
    sizeStyles[size],
    outlined ? `bg-transparent border ${border}` : bg,
    text,
    className
  ].filter(Boolean).join(' ')
  
  const dotColor = variant === 'default' ? 'bg-gray-400' : text.replace('text', 'bg')
  
  return (
    <span className={classes}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
      )}
      {children}
    </span>
  )
}

// Convenience components for common badges
export const SuccessBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => 
  <Badge variant="success" {...props} />

export const ErrorBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => 
  <Badge variant="error" {...props} />

export const WarningBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => 
  <Badge variant="warning" {...props} />

export const InfoBadge: React.FC<Omit<BadgeProps, 'variant'>> = (props) => 
  <Badge variant="info" {...props} />