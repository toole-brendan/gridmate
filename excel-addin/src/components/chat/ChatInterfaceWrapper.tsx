import React from 'react'
import { ChatInterfaceWithBackend } from './ChatInterfaceWithBackend'

export const ChatInterfaceWrapper: React.FC = () => {
  console.log('🎨 ChatInterfaceWrapper rendering')
  
  // Use the backend-connected version
  return <ChatInterfaceWithBackend />
}