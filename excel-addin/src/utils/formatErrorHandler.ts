export class FormatErrorHandler {
  static handleFormatError(error: Error, params: any): string {
    const errorMessage = error.message.toLowerCase()
    
    if (errorMessage.includes('invalid') && errorMessage.includes('argument')) {
      // Analyze parameters to provide specific guidance
      const suggestions: string[] = []
      
      if (params.font?.color && params.font.color.startsWith('#')) {
        suggestions.push('Remove # from color values')
      }
      
      if (params.font?.size && (params.font.size < 1 || params.font.size > 409)) {
        suggestions.push('Font size must be between 1 and 409')
      }
      
      if (params.fill_color && !isValidHexColor(params.fill_color)) {
        suggestions.push('Fill color must be valid hex format')
      }
      
      if (params.number_format && !isValidNumberFormat(params.number_format)) {
        suggestions.push('Number format may be invalid')
      }
      
      if (params.alignment?.horizontal && !isValidHorizontalAlignment(params.alignment.horizontal)) {
        suggestions.push('Invalid horizontal alignment value')
      }
      
      if (params.alignment?.vertical && !isValidVerticalAlignment(params.alignment.vertical)) {
        suggestions.push('Invalid vertical alignment value')
      }
      
      if (suggestions.length > 0) {
        return `Format error: ${error.message}. Suggestions: ${suggestions.join(', ')}`
      }
    }
    
    // Check for common Excel API error patterns
    if (errorMessage.includes('cannot complete this operation')) {
      return `Excel API error: ${error.message}. Try selecting the range first or ensure Excel is not busy.`
    }
    
    if (errorMessage.includes('object has been deleted')) {
      return `Excel object error: ${error.message}. The Excel object may have been deleted. Please refresh and try again.`
    }
    
    if (errorMessage.includes('permission')) {
      return `Permission error: ${error.message}. Excel may be in a protected view or the worksheet is protected.`
    }
    
    if (errorMessage.includes('range')) {
      return `Range error: ${error.message}. Please check that the range address is valid.`
    }
    
    // Default error message
    return `Format error: ${error.message}`
  }
  
  static logFormatAttempt(params: any, success: boolean, error?: Error) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      success,
      params: {
        range: params.range,
        hasNumberFormat: !!params.number_format,
        hasFont: !!params.font,
        hasFillColor: !!params.fill_color,
        hasAlignment: !!params.alignment,
        fontColor: params.font?.color,
        fontSize: params.font?.size,
        fillColor: params.fill_color,
        numberFormat: params.number_format
      },
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null
    }
    
    console.log('📊 Format operation log:', logEntry)
    
    // Store in sessionStorage for debugging (keep last 100 entries)
    try {
      const logs = JSON.parse(sessionStorage.getItem('formatLogs') || '[]')
      logs.push(logEntry)
      if (logs.length > 100) {
        logs.shift()
      }
      sessionStorage.setItem('formatLogs', JSON.stringify(logs))
    } catch (e) {
      console.warn('Failed to store format log:', e)
    }
  }
  
  static getFormatLogs(): any[] {
    try {
      return JSON.parse(sessionStorage.getItem('formatLogs') || '[]')
    } catch (e) {
      console.warn('Failed to retrieve format logs:', e)
      return []
    }
  }
  
  static clearFormatLogs() {
    sessionStorage.removeItem('formatLogs')
  }
}

function isValidHexColor(color: string): boolean {
  const hex = color.replace('#', '')
  return /^[0-9A-Fa-f]{6}$/.test(hex)
}

function isValidNumberFormat(format: string): boolean {
  // Basic validation for common number formats
  const validFormats = [
    'General', '0', '0.00', '#,##0', '#,##0.00', '0.00%', '$#,##0.00',
    '0.0%', '#,##0.0', '0.000', 'm/d/yyyy', 'h:mm:ss AM/PM', '@'
  ]
  
  if (validFormats.includes(format)) {
    return true
  }
  
  // Check for basic number format patterns
  return /^[0#$%.,\-\s"]+$/.test(format)
}

function isValidHorizontalAlignment(alignment: string): boolean {
  const validAlignments = ['left', 'center', 'right', 'fill', 'justify', 'centerContinuous', 'distributed']
  return validAlignments.includes(alignment)
}

function isValidVerticalAlignment(alignment: string): boolean {
  const validAlignments = ['top', 'center', 'bottom', 'justify', 'distributed']
  return validAlignments.includes(alignment)
}