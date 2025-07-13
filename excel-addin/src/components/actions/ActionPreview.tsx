import React, { useState } from 'react'
import { Check, X, FileSpreadsheet } from 'lucide-react'
import { ExcelService } from '@services/excel/ExcelService'

interface ProposedAction {
  id: string
  type: string
  description: string
  parameters: {
    range?: string
    values?: any[][]
    formula?: string
    [key: string]: any
  }
  confidence: number
  requires_approval: boolean
}

interface ActionPreviewProps {
  actions: ProposedAction[]
  onApply: (actionIds: string[]) => void
  onReject: () => void
}

export const ActionPreview: React.FC<ActionPreviewProps> = ({
  actions,
  onApply,
  onReject
}) => {
  const [selectedActions, setSelectedActions] = useState<Set<string>>(
    new Set(actions.map(a => a.id))
  )
  const [isApplying, setIsApplying] = useState(false)
  
  const excelService = ExcelService.getInstance()

  const toggleAction = (actionId: string) => {
    const newSelected = new Set(selectedActions)
    if (newSelected.has(actionId)) {
      newSelected.delete(actionId)
    } else {
      newSelected.add(actionId)
    }
    setSelectedActions(newSelected)
  }

  const handleApply = async () => {
    setIsApplying(true)
    try {
      // Apply selected actions to Excel
      for (const action of actions) {
        if (!selectedActions.has(action.id)) continue
        
        if (action.type === 'cell_update' && action.parameters.range && action.parameters.values) {
          await excelService.writeRange(action.parameters.range, action.parameters.values)
        } else if (action.type === 'formula_update' && action.parameters.range && action.parameters.formula) {
          await excelService.applyFormula(action.parameters.range, action.parameters.formula)
        }
      }
      
      onApply(Array.from(selectedActions))
    } catch (error) {
      console.error('Failed to apply actions:', error)
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Proposed Changes</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleApply}
            disabled={selectedActions.size === 0 || isApplying}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Check className="w-4 h-4" />
            Apply {selectedActions.size > 0 && `(${selectedActions.size})`}
          </button>
          <button
            onClick={onReject}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Reject
          </button>
        </div>
      </div>
      
      <div className="space-y-2">
        {actions.map((action) => (
          <div
            key={action.id}
            className={`border rounded p-3 cursor-pointer transition-colors ${
              selectedActions.has(action.id)
                ? 'bg-white border-blue-400'
                : 'bg-gray-50 border-gray-200'
            }`}
            onClick={() => toggleAction(action.id)}
          >
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={selectedActions.has(action.id)}
                onChange={() => toggleAction(action.id)}
                className="mt-1"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">
                  {action.description}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {action.type === 'cell_update' && action.parameters.range && (
                    <span>Range: {action.parameters.range}</span>
                  )}
                  {action.type === 'formula_update' && action.parameters.range && (
                    <span>Cell: {action.parameters.range} | Formula: {action.parameters.formula}</span>
                  )}
                </div>
                {action.confidence < 1 && (
                  <div className="text-xs text-gray-500 mt-1">
                    Confidence: {Math.round(action.confidence * 100)}%
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}