import React from 'react'
import { ExcelDiff } from '../../../types/enhanced-chat'
import { ChartBarIcon, ChartPieIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline'

interface ChartDiffProps {
  diff: ExcelDiff
}

export const ChartDiff: React.FC<ChartDiffProps> = ({ diff }) => {
  const isNewChart = !diff.before && diff.after
  const isDeletedChart = diff.before && !diff.after
  const isModifiedChart = diff.before && diff.after
  
  if (isNewChart) {
    return <NewChartDiff diff={diff} />
  } else if (isDeletedChart) {
    return <DeletedChartDiff diff={diff} />
  } else if (isModifiedChart) {
    return <ModifiedChartDiff diff={diff} />
  }
  
  return null
}

const NewChartDiff: React.FC<{ diff: ExcelDiff }> = ({ diff }) => {
  const chart = diff.after as any
  
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-green-900/30 rounded-full flex items-center justify-center">
          <span className="text-green-400">+</span>
        </div>
        <div>
          <div className="text-sm font-medium text-green-300">New Chart Created</div>
          <div className="text-xs text-gray-400">{diff.range}</div>
        </div>
      </div>
      
      <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          {getChartIcon(chart?.type)}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-200">{chart?.title || 'Untitled Chart'}</span>
              <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">
                {chart?.type || 'Column'} Chart
              </span>
            </div>
            
            <div className="text-xs text-gray-400 space-y-1">
              <div>Data Range: {chart?.dataRange || diff.range}</div>
              {chart?.series && <div>Series: {chart.series.length} data series</div>}
              {chart?.categories && <div>Categories: {chart.categories}</div>}
            </div>
            
            {chart?.options && (
              <div className="mt-2 pt-2 border-t border-gray-700">
                <div className="text-xs text-gray-500">Options:</div>
                <div className="text-xs text-gray-400 mt-1">
                  {chart.options.legend && '• Legend enabled'}
                  {chart.options.gridlines && ' • Gridlines visible'}
                  {chart.options.dataLabels && ' • Data labels shown'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const DeletedChartDiff: React.FC<{ diff: ExcelDiff }> = ({ diff }) => {
  const chart = diff.before as any
  
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-red-900/30 rounded-full flex items-center justify-center">
          <span className="text-red-400">-</span>
        </div>
        <div>
          <div className="text-sm font-medium text-red-300">Chart Deleted</div>
          <div className="text-xs text-gray-400">{diff.range}</div>
        </div>
      </div>
      
      <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4 opacity-75">
        <div className="flex items-center space-x-2">
          {getChartIcon(chart?.type)}
          <span className="text-sm text-red-300 line-through">
            {chart?.title || 'Untitled Chart'}
          </span>
        </div>
      </div>
    </div>
  )
}

const ModifiedChartDiff: React.FC<{ diff: ExcelDiff }> = ({ diff }) => {
  const before = diff.before as any
  const after = diff.after as any
  const changes = getChartChanges(before, after)
  
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-blue-900/30 rounded-full flex items-center justify-center">
          <span className="text-blue-400">↻</span>
        </div>
        <div>
          <div className="text-sm font-medium text-blue-300">Chart Modified</div>
          <div className="text-xs text-gray-400">{after?.title || 'Chart'} • {diff.range}</div>
        </div>
      </div>
      
      <div className="space-y-2">
        {changes.map((change, index) => (
          <div key={index} className="bg-gray-800/50 rounded p-3">
            <div className="text-xs text-gray-400 mb-1">{change.property}</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-red-300">
                <span className="text-xs text-gray-500">Before: </span>
                {formatChartValue(change.before)}
              </div>
              <div className="text-green-300">
                <span className="text-xs text-gray-500">After: </span>
                {formatChartValue(change.after)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Helper functions
const getChartIcon = (type?: string) => {
  const iconClass = "w-6 h-6 text-gray-400"
  switch (type?.toLowerCase()) {
    case 'pie':
    case 'doughnut':
      return <ChartPieIcon className={iconClass} />
    case 'line':
    case 'area':
      return <ArrowTrendingUpIcon className={iconClass} />
    default:
      return <ChartBarIcon className={iconClass} />
  }
}

const getChartChanges = (before: any, after: any): Array<{ property: string, before: any, after: any }> => {
  const changes: Array<{ property: string, before: any, after: any }> = []
  const properties = ['title', 'type', 'dataRange', 'series', 'categories', 'options']
  
  properties.forEach(prop => {
    if (JSON.stringify(before?.[prop]) !== JSON.stringify(after?.[prop])) {
      changes.push({
        property: prop.charAt(0).toUpperCase() + prop.slice(1),
        before: before?.[prop],
        after: after?.[prop]
      })
    }
  })
  
  return changes
}

const formatChartValue = (value: any): string => {
  if (value === null || value === undefined) return 'None'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}