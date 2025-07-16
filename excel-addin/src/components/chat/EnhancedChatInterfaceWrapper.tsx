import React from 'react'
import { RefactoredChatInterface } from './RefactoredChatInterface'

export const EnhancedChatInterfaceWrapper: React.FC = () => {
  console.log('🎨 EnhancedChatInterfaceWrapper rendering with REFACTORED component')
  
  // This wrapper exists to provide a clean separation and make it easy to swap implementations
  return <RefactoredChatInterface />
}