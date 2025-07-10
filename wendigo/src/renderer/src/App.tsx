import React, { useState, useEffect } from 'react'
import { TitleBar } from './components/TitleBar'
import { ChatPanel } from './components/ChatPanel'
import { StatusBar } from './components/StatusBar'
import { ConnectionStatus } from './components/ConnectionStatus'
import { useSpreadsheetStore } from './store/spreadsheetStore'
import { useChatStore } from './store/chatStore'

function App() {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionType, setConnectionType] = useState<'excel' | 'sheets' | null>(null)
  const { setActiveRange } = useSpreadsheetStore()

  useEffect(() => {
    // Try to auto-connect to Excel on startup
    handleConnect('excel')
  }, [])

  const handleConnect = async (type: 'excel' | 'sheets') => {
    try {
      const connected = await window.wendigo.connectSpreadsheet(type)
      if (connected) {
        setIsConnected(true)
        setConnectionType(type)
        
        // Get initial active range
        const range = await window.wendigo.getActiveRange()
        setActiveRange(range)
        
        // Subscribe to changes
        window.wendigo.onSpreadsheetChange((change) => {
          console.log('Spreadsheet change:', change)
          // Handle spreadsheet changes
        })
      }
    } catch (error) {
      console.error('Failed to connect:', error)
      setIsConnected(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      <TitleBar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <ConnectionStatus 
          isConnected={isConnected}
          connectionType={connectionType}
          onConnect={handleConnect}
        />
        
        <div className="flex-1 overflow-hidden">
          <ChatPanel isConnected={isConnected} />
        </div>
        
        <StatusBar />
      </div>
    </div>
  )
}

export default App