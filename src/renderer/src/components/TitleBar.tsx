import React from 'react'
import { Minimize2, Maximize2, X, Pin, PinOff } from 'lucide-react'

export const TitleBar: React.FC = () => {
  const [isPinned, setIsPinned] = React.useState(true)

  const handleTogglePin = async () => {
    await window.gridmate.setAlwaysOnTop(!isPinned)
    setIsPinned(!isPinned)
  }

  return (
    <div className="title-bar h-8 bg-gridmate-primary flex items-center justify-between px-3">
      <div className="flex items-center space-x-2">
        <img src="/assets/logo.svg" alt="Gridmate" className="h-5 w-5" />
        <span className="text-white text-sm font-medium">Gridmate</span>
      </div>
      
      <div className="flex items-center space-x-1">
        <button
          onClick={handleTogglePin}
          className="p-1 text-white hover:bg-gridmate-secondary rounded transition-colors"
          title={isPinned ? 'Unpin window' : 'Pin window'}
        >
          {isPinned ? <Pin size={16} /> : <PinOff size={16} />}
        </button>
        
        <button
          onClick={() => window.gridmate.minimize()}
          className="p-1 text-white hover:bg-gridmate-secondary rounded transition-colors"
        >
          <Minimize2 size={16} />
        </button>
        
        <button
          onClick={() => window.gridmate.maximize()}
          className="p-1 text-white hover:bg-gridmate-secondary rounded transition-colors"
        >
          <Maximize2 size={16} />
        </button>
        
        <button
          onClick={() => window.gridmate.close()}
          className="p-1 text-white hover:bg-red-600 rounded transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}