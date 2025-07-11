import React, { useState, useEffect } from 'react'
import { TitleBar } from './components/TitleBar'
import { ChatPanel } from './components/ChatPanel'
import { StatusBar } from './components/StatusBar'
import { ConnectionStatus } from './components/ConnectionStatus'
import { GoogleSheetsConnect } from './components/GoogleSheetsConnect'
import { useSpreadsheetStore } from './store/spreadsheetStore'
import { useChatStore } from './store/chatStore'

function App() {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionType, setConnectionType] = useState<'excel' | 'sheets' | null>(null)
  const [showSheetsDialog, setShowSheetsDialog] = useState(false)
  const { setActiveRange } = useSpreadsheetStore()

  useEffect(() => {
    // Try to auto-connect to Excel on startup
    handleConnect('excel')
  }, [])

  const handleConnect = async (type: 'excel' | 'sheets', options?: { spreadsheetId?: string }) => {
    // Show dialog for Google Sheets if no spreadsheetId provided
    if (type === 'sheets' && !options?.spreadsheetId) {
      setShowSheetsDialog(true)
      return
    }
    
    try {
      const connected = await window.gridmate.connectSpreadsheet(type, options)
      if (connected) {
        setIsConnected(true)
        setConnectionType(type)
        
        // Get initial active range
        const range = await window.gridmate.getActiveRange()
        setActiveRange(range)
        
        // Subscribe to changes
        window.gridmate.onSpreadsheetChange((change) => {
          console.log('Spreadsheet change:', change)
          // Handle spreadsheet changes
        })
      }
    } catch (error) {
      console.error('Failed to connect:', error)
      setIsConnected(false)
      alert(`Failed to connect: ${error.message || 'Unknown error'}`)
    }
  }
  
  const handleSheetsConnect = async (spreadsheetId: string) => {
    setShowSheetsDialog(false)
    await handleConnect('sheets', { spreadsheetId })
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
      
      {showSheetsDialog && (
        <GoogleSheetsConnect
          onConnect={handleSheetsConnect}
          onCancel={() => setShowSheetsDialog(false)}
        />
      )}
    </div>
  )
}

export default App