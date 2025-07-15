import React from 'react'

type TypographyVariant = 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'h4' 
  | 'body' 
  | 'body-sm' 
  | 'caption' 
  | 'overline' 
  | 'code'

type TypographyColor = 
  | 'primary' 
  | 'secondary' 
  | 'tertiary' 
  | 'muted' 
  | 'success' 
  | 'error' 
  | 'warning' 
  | 'info'

interface TypographyProps {
  variant?: TypographyVariant
  color?: TypographyColor
  className?: string
  children: React.ReactNode
  as?: keyof JSX.IntrinsicElements
  weight?: 'normal' | 'medium' | 'semibold' | 'bold'
  align?: 'left' | 'center' | 'right'
  noWrap?: boolean
  mono?: boolean
}

const variantStyles: Record<TypographyVariant, string> = {
  h1: 'text-2xl font-bold leading-tight',
  h2: 'text-xl font-semibold leading-tight',
  h3: 'text-lg font-semibold',
  h4: 'text-base font-medium',
  body: 'text-base',
  'body-sm': 'text-sm',
  caption: 'text-xs',
  overline: 'text-xs uppercase tracking-wider font-medium',
  code: 'font-mono text-sm'
}

const colorClasses: Record<TypographyColor, string> = {
  primary: 'text-gray-100',
  secondary: 'text-gray-400',
  tertiary: 'text-gray-500',
  muted: 'text-gray-600',
  success: 'text-green-400',
  error: 'text-red-400',
  warning: 'text-yellow-400',
  info: 'text-blue-400'
}

const weightClasses = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold'
}

const alignClasses = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right'
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  color = 'primary',
  className = '',
  children,
  as,
  weight,
  align,
  noWrap,
  mono
}) => {
  const Component = as || getDefaultComponent(variant)
  
  const classes = [
    variantStyles[variant],
    colorClasses[color],
    weight && weightClasses[weight],
    align && alignClasses[align],
    noWrap && 'truncate',
    mono && 'font-mono',
    className
  ].filter(Boolean).join(' ')
  
  return <Component className={classes}>{children}</Component>
}

function getDefaultComponent(variant: TypographyVariant): keyof JSX.IntrinsicElements {
  switch (variant) {
    case 'h1': return 'h1'
    case 'h2': return 'h2'
    case 'h3': return 'h3'
    case 'h4': return 'h4'
    case 'code': return 'code'
    default: return 'p'
  }
}

// Convenience components
export const H1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => 
  <Typography variant="h1" {...props} />

export const H2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => 
  <Typography variant="h2" {...props} />

export const H3: React.FC<Omit<TypographyProps, 'variant'>> = (props) => 
  <Typography variant="h3" {...props} />

export const H4: React.FC<Omit<TypographyProps, 'variant'>> = (props) => 
  <Typography variant="h4" {...props} />

export const Body: React.FC<Omit<TypographyProps, 'variant'>> = (props) => 
  <Typography variant="body" {...props} />

export const Caption: React.FC<Omit<TypographyProps, 'variant'>> = (props) => 
  <Typography variant="caption" {...props} />

export const Code: React.FC<Omit<TypographyProps, 'variant'>> = (props) => 
  <Typography variant="code" {...props} />