import React from 'react'
import { Clock, User, FileText, Check, X, AlertCircle } from 'lucide-react'

interface AuditEntry {
  id: string
  timestamp: Date
  user: string
  action: string
  entityType: string
  entityId?: string
  description: string
  status: 'success' | 'failed' | 'pending'
  metadata?: {
    cellReference?: string
    oldValue?: any
    newValue?: any
    formula?: string
    affectedCells?: string[]
  }
}

interface AuditTrailProps {
  entries: AuditEntry[]
  onExport?: () => void
  onFilter?: (filter: any) => void
  loading?: boolean
}

export const AuditTrail: React.FC<AuditTrailProps> = ({
  entries,
  onExport,
  onFilter,
  loading = false
}) => {
  const [expandedEntries, setExpandedEntries] = React.useState<Set<string>>(new Set())
  const [filterType, setFilterType] = React.useState<string>('all')

  const toggleExpanded = (entryId: string) => {
    const newExpanded = new Set(expandedEntries)
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId)
    } else {
      newExpanded.add(entryId)
    }
    setExpandedEntries(newExpanded)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <Check className="text-green-600" size={16} />
      case 'failed':
        return <X className="text-red-600" size={16} />
      case 'pending':
        return <Clock className="text-yellow-600" size={16} />
      default:
        return <AlertCircle className="text-gray-600" size={16} />
    }
  }

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('add')) return 'text-green-700'
    if (action.includes('update') || action.includes('modify')) return 'text-blue-700'
    if (action.includes('delete') || action.includes('remove')) return 'text-red-700'
    return 'text-gray-700'
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} min ago`
    if (hours < 24) return `${hours} hr ago`
    if (days < 7) return `${days} days ago`
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const filteredEntries = React.useMemo(() => {
    if (filterType === 'all') return entries
    return entries.filter(entry => entry.entityType === filterType)
  }, [entries, filterType])

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Audit Trail</h3>
          <div className="flex items-center gap-3">
            {/* Filter dropdown */}
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value)
                onFilter?.({ type: e.target.value })
              }}
              className="text-sm border rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Actions</option>
              <option value="cell">Cell Changes</option>
              <option value="formula">Formula Changes</option>
              <option value="document">Document Actions</option>
              <option value="ai">AI Suggestions</option>
            </select>

            {/* Export button */}
            {onExport && (
              <button
                onClick={onExport}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <FileText size={16} />
                Export
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Entries list */}
      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="inline-flex items-center gap-2">
              <Clock className="animate-spin" size={20} />
              Loading audit trail...
            </div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No audit entries found
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Main entry info */}
                  <div className="flex items-center gap-3 mb-1">
                    {getStatusIcon(entry.status)}
                    <span className={`font-medium ${getActionColor(entry.action)}`}>
                      {entry.action}
                    </span>
                    <span className="text-gray-500 text-sm">
                      {entry.entityType}
                      {entry.entityId && ` (${entry.entityId})`}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-700 ml-7">
                    {entry.description}
                  </p>

                  {/* Metadata (expandable) */}
                  {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                    <button
                      onClick={() => toggleExpanded(entry.id)}
                      className="ml-7 mt-2 text-xs text-blue-600 hover:text-blue-700"
                    >
                      {expandedEntries.has(entry.id) ? 'Hide' : 'Show'} details
                    </button>
                  )}

                  {expandedEntries.has(entry.id) && entry.metadata && (
                    <div className="ml-7 mt-2 p-3 bg-gray-50 rounded-md text-sm">
                      {entry.metadata.cellReference && (
                        <div className="mb-2">
                          <span className="text-gray-500">Cell:</span>
                          <span className="ml-2 font-mono">{entry.metadata.cellReference}</span>
                        </div>
                      )}
                      {entry.metadata.oldValue !== undefined && (
                        <div className="mb-2">
                          <span className="text-gray-500">Previous:</span>
                          <span className="ml-2 font-mono text-gray-700">
                            {String(entry.metadata.oldValue)}
                          </span>
                        </div>
                      )}
                      {entry.metadata.newValue !== undefined && (
                        <div className="mb-2">
                          <span className="text-gray-500">New:</span>
                          <span className="ml-2 font-mono text-gray-900">
                            {String(entry.metadata.newValue)}
                          </span>
                        </div>
                      )}
                      {entry.metadata.formula && (
                        <div className="mb-2">
                          <span className="text-gray-500">Formula:</span>
                          <span className="ml-2 font-mono text-blue-700">
                            {entry.metadata.formula}
                          </span>
                        </div>
                      )}
                      {entry.metadata.affectedCells && entry.metadata.affectedCells.length > 0 && (
                        <div>
                          <span className="text-gray-500">Affected cells:</span>
                          <span className="ml-2 text-gray-700">
                            {entry.metadata.affectedCells.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Timestamp and user */}
                <div className="text-right ml-4">
                  <div className="text-xs text-gray-500">
                    {formatTimestamp(entry.timestamp)}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center justify-end gap-1 mt-1">
                    <User size={12} />
                    {entry.user}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load more */}
      {!loading && filteredEntries.length >= 20 && (
        <div className="border-t px-4 py-3 text-center">
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Load more entries
          </button>
        </div>
      )}
    </div>
  )
}