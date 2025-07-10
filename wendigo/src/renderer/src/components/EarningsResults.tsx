import React from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  FileText,
  Download,
  Table
} from 'lucide-react'

interface EarningsData {
  company: {
    name: string
    ticker: string
    exchange?: string
  }
  period: string
  filingDate: string
  formType: string
  metrics: {
    revenue?: number
    revenueYoY?: number
    netIncome?: number
    eps?: number
    epsYoY?: number
    guidance?: {
      revenue?: { low: number, high: number }
      eps?: { low: number, high: number }
    }
  }
  highlights?: string[]
}

interface EarningsResultsProps {
  data: EarningsData
  onAddToSpreadsheet?: (data: EarningsData) => void
  onViewFiling?: (data: EarningsData) => void
}

export const EarningsResults: React.FC<EarningsResultsProps> = ({
  data,
  onAddToSpreadsheet,
  onViewFiling
}) => {
  const formatCurrency = (value?: number) => {
    if (!value) return 'N/A'
    const absValue = Math.abs(value)
    if (absValue >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`
    } else if (absValue >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`
    }
    return `$${value.toFixed(2)}`
  }
  
  const formatPercent = (value?: number) => {
    if (!value) return null
    return (
      <span className={value >= 0 ? 'text-green-600' : 'text-red-600'}>
        {value >= 0 ? '+' : ''}{value.toFixed(1)}%
      </span>
    )
  }
  
  const formatEPS = (value?: number) => {
    if (!value) return 'N/A'
    return `$${value.toFixed(2)}`
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            {data.company.name}
          </h3>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
            <span className="font-medium">{data.company.ticker}</span>
            {data.company.exchange && (
              <>
                <span>•</span>
                <span>{data.company.exchange}</span>
              </>
            )}
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {data.period}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onAddToSpreadsheet && (
            <button
              onClick={() => onAddToSpreadsheet(data)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-sm font-medium transition-colors"
            >
              <Table className="h-4 w-4" />
              Add to Sheet
            </button>
          )}
          {onViewFiling && (
            <button
              onClick={() => onViewFiling(data)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-md text-sm font-medium transition-colors"
            >
              <FileText className="h-4 w-4" />
              View Filing
            </button>
          )}
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Revenue */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <DollarSign className="h-4 w-4" />
            <span>Revenue</span>
          </div>
          <div className="text-2xl font-semibold text-gray-900">
            {formatCurrency(data.metrics.revenue)}
          </div>
          {data.metrics.revenueYoY && (
            <div className="flex items-center gap-1 mt-1">
              {data.metrics.revenueYoY >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              {formatPercent(data.metrics.revenueYoY)} YoY
            </div>
          )}
        </div>
        
        {/* EPS */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <DollarSign className="h-4 w-4" />
            <span>EPS</span>
          </div>
          <div className="text-2xl font-semibold text-gray-900">
            {formatEPS(data.metrics.eps)}
          </div>
          {data.metrics.epsYoY && (
            <div className="flex items-center gap-1 mt-1">
              {data.metrics.epsYoY >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              {formatPercent(data.metrics.epsYoY)} YoY
            </div>
          )}
        </div>
      </div>
      
      {/* Guidance */}
      {data.metrics.guidance && (
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Forward Guidance</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {data.metrics.guidance.revenue && (
              <div>
                <span className="text-blue-700">Revenue:</span>
                <span className="ml-2 font-medium text-blue-900">
                  {formatCurrency(data.metrics.guidance.revenue.low)} - {formatCurrency(data.metrics.guidance.revenue.high)}
                </span>
              </div>
            )}
            {data.metrics.guidance.eps && (
              <div>
                <span className="text-blue-700">EPS:</span>
                <span className="ml-2 font-medium text-blue-900">
                  {formatEPS(data.metrics.guidance.eps.low)} - {formatEPS(data.metrics.guidance.eps.high)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Highlights */}
      {data.highlights && data.highlights.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Key Highlights</h4>
          <ul className="space-y-1">
            {data.highlights.map((highlight, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start">
                <span className="text-gray-400 mr-2">•</span>
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Filing Info */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
        <span>Form {data.formType}</span>
        <span>Filed {new Date(data.filingDate).toLocaleDateString()}</span>
      </div>
    </div>
  )
}