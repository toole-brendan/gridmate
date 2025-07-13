import React from 'react'
import { ChatInterfaceWithSignalR } from './ChatInterfaceWithSignalR'

export const ChatInterfaceWrapper: React.FC = () => {
  console.log('🎨 ChatInterfaceWrapper rendering')
  
  // Use the SignalR version for reliable bidirectional communication
  return <ChatInterfaceWithSignalR />
}