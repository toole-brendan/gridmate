/**
 * Custom error types for Excel add-in
 */

/**
 * Error thrown when a tool execution fails
 */
export class ToolExecutionError extends Error {
  public readonly toolName: string;
  public readonly params: any;
  public readonly innerError: Error | unknown;

  constructor(toolName: string, params: any, error: Error | unknown) {
    const paramsStr = JSON.stringify(params, null, 2);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    super(`ToolExecutionError: Failed to execute tool '${toolName}' with params ${paramsStr}. Error: ${errorMessage}`);
    
    this.name = 'ToolExecutionError';
    this.toolName = toolName;
    this.params = params;
    this.innerError = error;
    
    // Maintains proper stack trace for where our error was thrown (only works on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ToolExecutionError);
    }
  }
}

/**
 * Error thrown when parameters are missing or invalid
 */
export class InvalidParametersError extends Error {
  public readonly toolName: string;
  public readonly receivedParams: any;

  constructor(toolName: string, receivedParams: any) {
    super(`Invalid parameters for tool '${toolName}': ${JSON.stringify(receivedParams)}`);
    
    this.name = 'InvalidParametersError';
    this.toolName = toolName;
    this.receivedParams = receivedParams;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidParametersError);
    }
  }
} 