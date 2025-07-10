import { useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'

export interface ErrorNotification {
  message: string
  type: 'info' | 'warning' | 'error'
  timestamp: string
}

export function useErrorHandler() {
  useEffect(() => {
    // Listen for error notifications from the main process
    const handleErrorNotification = (_event: any, notification: ErrorNotification) => {
      switch (notification.type) {
        case 'error':
          toast.error(notification.message, {
            duration: 5000,
            position: 'top-right'
          })
          break
        case 'warning':
          toast(notification.message, {
            duration: 4000,
            position: 'top-right',
            icon: '⚠️'
          })
          break
        case 'info':
          toast(notification.message, {
            duration: 3000,
            position: 'top-right',
            icon: 'ℹ️'
          })
          break
      }
    }

    window.electron.ipcRenderer.on('error-notification', handleErrorNotification)

    return () => {
      window.electron.ipcRenderer.removeAllListeners('error-notification')
    }
  }, [])

  const handleError = useCallback((error: Error | unknown, context?: string) => {
    console.error('Frontend error:', { error, context })
    
    let message = 'An unexpected error occurred'
    
    if (error instanceof Error) {
      message = error.message
    } else if (typeof error === 'string') {
      message = error
    }
    
    // Show user-friendly error message
    toast.error(context ? `${context}: ${message}` : message, {
      duration: 5000,
      position: 'top-right'
    })
  }, [])

  return { handleError }
}