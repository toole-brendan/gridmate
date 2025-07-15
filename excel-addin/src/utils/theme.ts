// Theme constants for consistent design
export const theme = {
  colors: {
    // Base colors
    bg: {
      primary: '#0d1117',
      secondary: '#161b22',
      tertiary: '#21262d',
      hover: '#30363d',
      active: '#484f58'
    },
    
    // Text colors
    text: {
      primary: '#f0f6fc',
      secondary: '#8b949e',
      tertiary: '#6e7681',
      muted: '#484f58'
    },
    
    // Accent colors
    accent: {
      blue: '#2563eb',
      green: '#10b981',
      red: '#ef4444',
      yellow: '#f59e0b',
      purple: '#8b5cf6',
      cyan: '#06b6d4',
      orange: '#f97316'
    },
    
    // Semantic colors
    semantic: {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#2563eb'
    },
    
    // Border colors
    border: {
      primary: '#30363d',
      secondary: '#21262d',
      hover: '#484f58'
    }
  },
  
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  },
  
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px'
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  },
  
  transitions: {
    fast: '150ms ease',
    base: '200ms ease',
    slow: '300ms ease'
  },
  
  typography: {
    fontFamily: {
      sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif",
      mono: "ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace"
    },
    
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem'
    },
    
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  }
} as const

// Utility functions
export const getColorWithOpacity = (color: string, opacity: number): string => {
  // Convert hex to rgba
  const hex = color.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

export const getDiffColor = (type: 'add' | 'remove' | 'modify'): string => {
  switch (type) {
    case 'add':
      return theme.colors.accent.green
    case 'remove':
      return theme.colors.accent.red
    case 'modify':
      return theme.colors.accent.blue
  }
}

export const getStatusColor = (status: 'success' | 'error' | 'warning' | 'info' | 'pending'): string => {
  switch (status) {
    case 'success':
      return theme.colors.semantic.success
    case 'error':
      return theme.colors.semantic.error
    case 'warning':
      return theme.colors.semantic.warning
    case 'info':
      return theme.colors.semantic.info
    case 'pending':
      return theme.colors.accent.blue
  }
}

// CSS-in-JS style helpers
export const createBoxShadow = (elevation: 'sm' | 'md' | 'lg' | 'xl' = 'md'): string => {
  return theme.shadows[elevation]
}

export const createTransition = (properties: string[], speed: 'fast' | 'base' | 'slow' = 'base'): string => {
  return properties.map(prop => `${prop} ${theme.transitions[speed]}`).join(', ')
}