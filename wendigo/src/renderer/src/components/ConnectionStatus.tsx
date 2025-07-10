import React from 'react'
import { FileSpreadsheet, Table, AlertCircle, CheckCircle } from 'lucide-react'

interface ConnectionStatusProps {
  isConnected: boolean
  connectionType: 'excel' | 'sheets' | null
  onConnect: (type: 'excel' | 'sheets') => void
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  connectionType,
  onConnect
}) => {
  if (isConnected && connectionType) {
    return (
      <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-800 dark:text-green-200">
              Connected to {connectionType === 'excel' ? 'Excel' : 'Google Sheets'}
            </span>
          </div>
          <button
            onClick={() => onConnect(connectionType === 'excel' ? 'sheets' : 'excel')}
            className="text-xs text-gray-600 dark:text-gray-400 hover:underline"
          >
            Switch to {connectionType === 'excel' ? 'Sheets' : 'Excel'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-2 mb-2">
        <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
        <span className="text-sm text-yellow-800 dark:text-yellow-200">
          Not connected to a spreadsheet
        </span>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={() => onConnect('excel')}
          className="flex items-center space-x-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
        >
          <FileSpreadsheet size={16} />
          <span>Connect Excel</span>
        </button>
        <button
          onClick={() => onConnect('sheets')}
          className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
        >
          <Table size={16} />
          <span>Connect Sheets</span>
        </button>
      </div>
    </div>
  )
}