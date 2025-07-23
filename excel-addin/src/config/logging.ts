/**
 * Global logging configuration for the Excel Add-in
 * 
 * This configuration helps reduce console noise and prevent browser warnings
 * about suppressed console messages.
 */

export interface LogConfig {
  // Master switch for all logging
  GLOBAL_LOGGING_ENABLED: boolean;
  
  // Component-specific logging flags
  EXCEL_SERVICE: {
    WORKSHEET_CHANGES: boolean;
    USER_EDITS: boolean;
    CONTEXT_DETAILS: boolean;
    RANGE_OPERATIONS: boolean;
    TOOL_EXECUTION: boolean;
    ERRORS: boolean;
  };
  
  CHAT_INTERFACE: {
    MESSAGE_FLOW: boolean;
    STATE_UPDATES: boolean;
    SIGNALR_MESSAGES: boolean;
    DEBUG_INFO: boolean;
  };
  
  DIFF_PREVIEW: {
    OPERATIONS: boolean;
    VISUAL_UPDATES: boolean;
  };
}

// Default configuration - mostly disabled to reduce noise
export const LOG_CONFIG: LogConfig = {
  GLOBAL_LOGGING_ENABLED: true,
  
  EXCEL_SERVICE: {
    WORKSHEET_CHANGES: false,  // Disable noisy worksheet change events
    USER_EDITS: false,         // Disable individual edit tracking
    CONTEXT_DETAILS: false,    // Disable detailed context logging
    RANGE_OPERATIONS: true,    // Keep range operations visible
    TOOL_EXECUTION: true,      // Keep tool execution visible
    ERRORS: true               // Always show errors
  },
  
  CHAT_INTERFACE: {
    MESSAGE_FLOW: true,        // Keep message flow visible
    STATE_UPDATES: false,      // Disable state update logs
    SIGNALR_MESSAGES: true,    // Keep SignalR messages visible
    DEBUG_INFO: false          // Disable verbose debug info
  },
  
  DIFF_PREVIEW: {
    OPERATIONS: true,          // Keep diff operations visible
    VISUAL_UPDATES: false      // Disable visual update logs
  }
};

/**
 * Helper function for conditional logging
 * @param component The component category
 * @param subcategory The specific log type
 * @param args The arguments to log
 */
export function conditionalLog(
  component: keyof Omit<LogConfig, 'GLOBAL_LOGGING_ENABLED'>,
  subcategory: string,
  ...args: any[]
): void {
  if (!LOG_CONFIG.GLOBAL_LOGGING_ENABLED) {
    return;
  }
  
  const componentConfig = LOG_CONFIG[component] as any;
  if (componentConfig && componentConfig[subcategory]) {
    console.log(...args);
  }
}

/**
 * Error logging helper - always logs errors regardless of config
 */
export function logError(...args: any[]): void {
  console.error(...args);
}

/**
 * Warning logging helper
 */
export function logWarning(...args: any[]): void {
  if (LOG_CONFIG.GLOBAL_LOGGING_ENABLED) {
    console.warn(...args);
  }
}

// Export a function to update log config at runtime if needed
export function updateLogConfig(updates: Partial<LogConfig>): void {
  Object.assign(LOG_CONFIG, updates);
}