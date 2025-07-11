import React from 'react'
import { Minimize2, Maximize2, X, Pin, PinOff } from 'lucide-react'

export const TitleBar: React.FC = () => {
  const [isPinned, setIsPinned] = React.useState(true)

  const handleTogglePin = async () => {
    await window.wendigo.setAlwaysOnTop(!isPinned)
    setIsPinned(!isPinned)
  }

  return (
    <div className="title-bar h-8 bg-wendigo-primary flex items-center justify-between px-3">
      <div className="flex items-center space-x-2">
        <img src="/assets/logo.svg" alt="Wendigo" className="h-5 w-5" />
        <span className="text-white text-sm font-medium">Wendigo</span>
      </div>
      
      <div className="flex items-center space-x-1">
        <button
          onClick={handleTogglePin}
          className="p-1 text-white hover:bg-wendigo-secondary rounded transition-colors"
          title={isPinned ? 'Unpin window' : 'Pin window'}
        >
          {isPinned ? <Pin size={16} /> : <PinOff size={16} />}
        </button>
        
        <button
          onClick={() => window.wendigo.minimize()}
          className="p-1 text-white hover:bg-wendigo-secondary rounded transition-colors"
        >
          <Minimize2 size={16} />
        </button>
        
        <button
          onClick={() => window.wendigo.maximize()}
          className="p-1 text-white hover:bg-wendigo-secondary rounded transition-colors"
        >
          <Maximize2 size={16} />
        </button>
        
        <button
          onClick={() => window.wendigo.close()}
          className="p-1 text-white hover:bg-red-600 rounded transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}