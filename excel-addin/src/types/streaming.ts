export interface StreamChunk {
    id: string;
    type: 'text' | 'tool_start' | 'tool_progress' | 'tool_complete' | 'tool_result' | 'tool_status' | 'phase_change' | 'done' | 'actions' | 'error';
    content?: string;  // Full content (used by some backends)
    delta?: string;    // Incremental content (used for streaming)
    toolCall?: {
        id: string;
        name: string;
        input?: any;
    };
    actions?: any[];   // For actions chunk type
    done: boolean;
    error?: string;
    phase?: 'initial' | 'tool_execution' | 'tool_continuation' | 'final';
    metadata?: {
        tool_count?: number;
        message?: string;
        [key: string]: any;
    };
}

export interface StreamingMessage {
    id: string;
    role: 'assistant';
    content: string;
    isStreaming: boolean;
    streamStartTime?: number;
    streamEndTime?: number;
    toolCalls?: StreamingToolCall[];
    chunks: StreamChunk[];
}

export interface StreamingToolCall {
    id: string;
    name: string;
    status: 'running' | 'complete' | 'error' | 'queued';
    progress?: string;
    input?: any;
    output?: any;
    error?: string;
    startTime?: number;
    endTime?: number;
}

// Streaming session state
export interface StreamingSession {
    messageId: string;
    phase: 'initial' | 'tool_execution' | 'tool_continuation' | 'final';
    pendingTools: StreamingToolCall[];
    executedTools: Record<string, any>;
    contentChunks: string[];
    startTime: number;
    lastUpdate: number;
}

// Type guard
export function isStreamingMessage(message: any): message is StreamingMessage {
    return message && 'isStreaming' in message;
}