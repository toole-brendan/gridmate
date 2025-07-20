import { useState, useEffect, useCallback } from 'react'
import { EnhancedChatMessage } from '../types/enhanced-chat'

interface PersistedChatState {
  messages: EnhancedChatMessage[]
  sessionId: string
  lastUpdated: string
}

export function usePersistedChat(sessionId: string) {
  const storageKey = `gridmate_chat_${sessionId}`
  
  // Initialize from localStorage
  const [messages, setMessages] = useState<EnhancedChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed: PersistedChatState = JSON.parse(stored)
        // Only restore if same session and recent (within 24 hours)
        const lastUpdate = new Date(parsed.lastUpdated)
        const now = new Date()
        const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)
        
        if (parsed.sessionId === sessionId && hoursSinceUpdate < 24) {
          return parsed.messages
        }
      }
    } catch (error) {
      console.error('Failed to restore chat from localStorage:', error)
    }
    return []
  })
  
  // Persist on every change
  useEffect(() => {
    const state: PersistedChatState = {
      messages,
      sessionId,
      lastUpdated: new Date().toISOString()
    }
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(state))
    } catch (error) {
      console.error('Failed to persist chat to localStorage:', error)
      // Handle quota exceeded - remove old chats
      if (error.name === 'QuotaExceededError') {
        clearOldChats()
        try {
          localStorage.setItem(storageKey, JSON.stringify(state))
        } catch (retryError) {
          console.error('Failed to persist after cleanup:', retryError)
        }
      }
    }
  }, [messages, sessionId, storageKey])
  
  const addMessage = useCallback((message: EnhancedChatMessage) => {
    setMessages(prev => [...prev, message])
  }, [])
  
  const updateMessage = useCallback((id: string, updates: Partial<EnhancedChatMessage>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ))
  }, [])
  
  const clearMessages = useCallback(() => {
    setMessages([])
    localStorage.removeItem(storageKey)
  }, [storageKey])
  
  return {
    messages,
    addMessage,
    updateMessage,
    clearMessages,
    setMessages
  }
}

// Helper to clean up old chats
function clearOldChats() {
  const keys = Object.keys(localStorage)
  const chatKeys = keys.filter(k => k.startsWith('gridmate_chat_'))
  
  // Sort by last update and keep only recent 5 sessions
  const sessions = chatKeys.map(key => {
    try {
      const data = JSON.parse(localStorage.getItem(key) || '{}')
      return { key, lastUpdated: new Date(data.lastUpdated || 0) }
    } catch {
      return { key, lastUpdated: new Date(0) }
    }
  }).sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
  
  // Remove all but the 5 most recent
  sessions.slice(5).forEach(({ key }) => {
    localStorage.removeItem(key)
  })
}