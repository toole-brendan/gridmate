import React, { useState } from 'react'
import { X, Table, Info } from 'lucide-react'

interface GoogleSheetsConnectProps {
  onConnect: (spreadsheetId: string) => void
  onCancel: () => void
}

export const GoogleSheetsConnect: React.FC<GoogleSheetsConnectProps> = ({
  onConnect,
  onCancel
}) => {
  const [spreadsheetId, setSpreadsheetId] = useState('')
  const [error, setError] = useState('')

  const extractSpreadsheetId = (input: string): string => {
    // Handle full URL
    const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    if (urlMatch) {
      return urlMatch[1]
    }
    
    // Assume it's already just the ID
    return input.trim()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!spreadsheetId.trim()) {
      setError('Please enter a spreadsheet ID or URL')
      return
    }
    
    const id = extractSpreadsheetId(spreadsheetId)
    if (!id) {
      setError('Invalid spreadsheet ID or URL')
      return
    }
    
    onConnect(id)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-96">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Table className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Connect to Google Sheets</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label 
              htmlFor="spreadsheetId" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Spreadsheet URL or ID
            </label>
            <input
              id="spreadsheetId"
              type="text"
              value={spreadsheetId}
              onChange={(e) => {
                setSpreadsheetId(e.target.value)
                setError('')
              }}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              autoFocus
            />
            {error && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-4">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="mb-1">To find your spreadsheet ID:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Open your Google Sheet</li>
                  <li>Look at the URL in your browser</li>
                  <li>Copy the ID between /d/ and /edit</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Connect
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}