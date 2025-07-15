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
    bg: 'bg-secondary-background',
    text: 'text-text-secondary',
    border: 'border-border-primary'
  },
  success: {
    bg: 'bg-success/10',
    text: 'text-success',
    border: 'border-success'
  },
  error: {
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    border: 'border-destructive'
  },
  warning: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    border: 'border-warning'
  },
  info: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    border: 'border-primary'
  },
  purple: {
    bg: 'bg-[#AF52DE]/10',
    text: 'text-[#AF52DE]',
    border: 'border-[#AF52DE]'
  },
  cyan: {
    bg: 'bg-[#32ADE6]/10',
    text: 'text-[#32ADE6]',
    border: 'border-[#32ADE6]'
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
    'inline-flex items-center gap-1 rounded-md font-medium transition-colors',
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