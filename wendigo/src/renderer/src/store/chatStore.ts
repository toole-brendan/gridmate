import { create } from 'zustand'
import { ChatMessage } from '@shared/types/ai'

interface ChatState {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  addMessage: (message: ChatMessage) => void
  clearMessages: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  error: null,

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message]
    })),

  clearMessages: () =>
    set({
      messages: [],
      error: null
    }),

  setLoading: (loading) =>
    set({ isLoading: loading }),

  setError: (error) =>
    set({ error })
}))