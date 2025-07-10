import React from 'react'
import { AutonomyLevel } from '@shared/types/autonomy'

interface AutonomySliderProps {
  currentLevel: AutonomyLevel
  onLevelChange: (level: AutonomyLevel) => void
  batchCounter?: number
  disabled?: boolean
}

export const AutonomySlider: React.FC<AutonomySliderProps> = ({
  currentLevel,
  onLevelChange,
  batchCounter = 0,
  disabled = false
}) => {
  const levels = [
    {
      level: AutonomyLevel.MANUAL,
      label: 'Manual',
      description: 'You type everything',
      icon: '✍️'
    },
    {
      level: AutonomyLevel.APPROVAL,
      label: 'Approval',
      description: 'Approve each change',
      icon: '✓'
    },
    {
      level: AutonomyLevel.BATCH,
      label: 'Batch',
      description: 'Auto-apply up to 25',
      icon: '⚡'
    }
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">AI Autonomy</h3>
        {currentLevel === AutonomyLevel.BATCH && (
          <span className="text-xs text-gray-500">
            {25 - batchCounter} changes remaining
          </span>
        )}
      </div>
      
      <div className="relative">
        {/* Slider Track */}
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-2 bg-gray-200 rounded-full" />
        </div>
        
        {/* Slider Options */}
        <div className="relative flex justify-between">
          {levels.map((levelOption, index) => {
            const isActive = currentLevel === levelOption.level
            const isPast = currentLevel > levelOption.level
            
            return (
              <button
                key={levelOption.level}
                onClick={() => onLevelChange(levelOption.level)}
                disabled={disabled}
                className={`
                  relative flex flex-col items-center
                  ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                  ${isActive ? 'z-10' : ''}
                `}
              >
                {/* Dot */}
                <div
                  className={`
                    w-6 h-6 rounded-full border-2 transition-all
                    ${isActive 
                      ? 'bg-blue-500 border-blue-500 scale-125' 
                      : isPast
                        ? 'bg-blue-200 border-blue-200'
                        : 'bg-white border-gray-300'
                    }
                  `}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-xs">
                    {levelOption.icon}
                  </span>
                </div>
                
                {/* Label */}
                <div className="mt-2 text-center">
                  <div className={`
                    text-xs font-medium
                    ${isActive ? 'text-blue-600' : 'text-gray-600'}
                  `}>
                    {levelOption.label}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 w-20">
                    {levelOption.description}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
      
      {/* Progress bar for batch mode */}
      {currentLevel === AutonomyLevel.BATCH && batchCounter > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Batch Progress</span>
            <span>{batchCounter}/25</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${(batchCounter / 25) * 100}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Warning for batch limit */}
      {currentLevel === AutonomyLevel.BATCH && batchCounter >= 25 && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          Batch limit reached. Switch to Approval mode or reset batch to continue.
        </div>
      )}
    </div>
  )
}