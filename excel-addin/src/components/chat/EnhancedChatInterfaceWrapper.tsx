import React from 'react'
import { EnhancedChatInterfaceWithSignalR } from './EnhancedChatInterfaceWithSignalR'

export const EnhancedChatInterfaceWrapper: React.FC = () => {
  console.log('🎨 EnhancedChatInterfaceWrapper rendering')
  
  // This wrapper exists to provide a clean separation and make it easy to swap implementations
  return <EnhancedChatInterfaceWithSignalR />
}