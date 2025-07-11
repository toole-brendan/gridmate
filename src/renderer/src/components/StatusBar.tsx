import React from 'react'
import { Activity, Database, Clock } from 'lucide-react'
import { useSpreadsheetStore } from '../store/spreadsheetStore'

export const StatusBar: React.FC = () => {
  const { activeRange, lastUpdate } = useSpreadsheetStore()

  return (
    <div className="h-8 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center px-3 text-xs text-gray-600 dark:text-gray-400">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <Activity className="w-3 h-3" />
          <span>Ready</span>
        </div>
        
        {activeRange && (
          <div className="flex items-center space-x-1">
            <Database className="w-3 h-3" />
            <span>Range: {activeRange.address}</span>
          </div>
        )}
        
        {lastUpdate && (
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Updated: {new Date(lastUpdate).toLocaleTimeString()}</span>
          </div>
        )}
      </div>
      
      <div className="ml-auto">
        <span className="text-gridmate-accent">v0.1.0</span>
      </div>
    </div>
  )
}