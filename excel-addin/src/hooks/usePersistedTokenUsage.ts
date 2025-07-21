import { useState, useEffect } from 'react';
import { TokenUsage } from '../types/signalr';

const STORAGE_KEY = 'gridmate_token_usage';

export const usePersistedTokenUsage = (sessionId: string) => {
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${sessionId}`);
    if (stored) {
      try {
        setTokenUsage(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to parse stored token usage:', error);
      }
    }
  }, [sessionId]);

  // Update and persist
  const updateTokenUsage = (usage: TokenUsage | null) => {
    setTokenUsage(usage);
    if (usage) {
      localStorage.setItem(`${STORAGE_KEY}_${sessionId}`, JSON.stringify(usage));
    } else {
      localStorage.removeItem(`${STORAGE_KEY}_${sessionId}`);
    }
  };

  const clearTokenUsage = () => {
    localStorage.removeItem(`${STORAGE_KEY}_${sessionId}`);
    setTokenUsage(null);
  };

  return { tokenUsage, updateTokenUsage, clearTokenUsage };
};