import React from 'react'
import { Change, ChangeImpact, OperationType } from '@shared/types/autonomy'
import { Check, X, AlertTriangle, Info } from 'lucide-react'

interface ChangePreviewProps {
  changes: Change[]
  onApprove: (changeIds: string[]) => void
  onReject: (changeIds: string[]) => void
  onApproveAll: () => void
  onRejectAll: () => void
}

export const ChangePreview: React.FC<ChangePreviewProps> = ({
  changes,
  onApprove,
  onReject,
  onApproveAll,
  onRejectAll
}) => {
  const [selectedChanges, setSelectedChanges] = React.useState<Set<string>>(new Set())

  const toggleSelection = (changeId: string) => {
    const newSelection = new Set(selectedChanges)
    if (newSelection.has(changeId)) {
      newSelection.delete(changeId)
    } else {
      newSelection.add(changeId)
    }
    setSelectedChanges(newSelection)
  }

  const approveSelected = () => {
    onApprove(Array.from(selectedChanges))
    setSelectedChanges(new Set())
  }

  const rejectSelected = () => {
    onReject(Array.from(selectedChanges))
    setSelectedChanges(new Set())
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getOperationIcon = (type: OperationType) => {
    switch (type) {
      case OperationType.CELL_VALUE:
        return '📊'
      case OperationType.FORMULA:
        return '🧮'
      case OperationType.FORMATTING:
        return '🎨'
      case OperationType.ROW_INSERTION:
        return '➕'
      case OperationType.ROW_DELETION:
        return '➖'
      case OperationType.SHEET_CREATION:
        return '📄'
      case OperationType.DATA_IMPORT:
        return '📥'
      default:
        return '📝'
    }
  }

  if (changes.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Proposed Changes ({changes.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={onApproveAll}
            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm flex items-center gap-1"
          >
            <Check size={14} />
            Approve All
          </button>
          <button
            onClick={onRejectAll}
            className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm flex items-center gap-1"
          >
            <X size={14} />
            Reject All
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {changes.map((change) => (
          <div
            key={change.id}
            className={`border rounded-lg p-3 cursor-pointer transition-all ${
              selectedChanges.has(change.id)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => toggleSelection(change.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getOperationIcon(change.type)}</span>
                  <span className="font-medium text-gray-900">
                    {change.target}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${getRiskColor(change.impact.estimatedRisk)}`}>
                    {change.impact.estimatedRisk} risk
                  </span>
                </div>

                {/* Change details */}
                <div className="space-y-1 text-sm">
                  {change.type === OperationType.FORMULA && change.formula && (
                    <div className="font-mono bg-gray-100 p-2 rounded">
                      <div className="text-gray-500">Formula:</div>
                      <div className="text-gray-900">{change.formula}</div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-gray-500">From:</span>
                      <span className="ml-2 font-mono text-gray-700">
                        {change.oldValue === null ? 'empty' : String(change.oldValue)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">To:</span>
                      <span className="ml-2 font-mono text-gray-900 font-medium">
                        {String(change.newValue)}
                      </span>
                    </div>
                  </div>

                  {/* Impact information */}
                  {change.impact.affectedCells.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
                      <AlertTriangle size={12} />
                      <span>
                        Affects {change.impact.affectedCells.length} other cells
                      </span>
                    </div>
                  )}

                  {!change.impact.reversible && (
                    <div className="flex items-center gap-2 text-xs text-red-600 mt-1">
                      <Info size={12} />
                      <span>This change cannot be automatically undone</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Individual approve/reject buttons */}
              <div className="flex gap-1 ml-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onApprove([change.id])
                  }}
                  className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                  title="Approve this change"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onReject([change.id])
                  }}
                  className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                  title="Reject this change"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bulk actions for selected items */}
      {selectedChanges.size > 0 && (
        <div className="mt-4 pt-4 border-t flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {selectedChanges.size} changes selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={approveSelected}
              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              Approve Selected
            </button>
            <button
              onClick={rejectSelected}
              className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              Reject Selected
            </button>
          </div>
        </div>
      )}
    </div>
  )
}