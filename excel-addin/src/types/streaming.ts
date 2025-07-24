export interface StreamChunk {
    id: string;
    type: 'text' | 'tool_start' | 'tool_progress' | 'tool_complete' | 'tool_result' | 'done';
    content?: string;  // Full content (used by some backends)
    delta?: string;    // Incremental content (used for streaming)
    toolCall?: {
        id: string;
        name: string;
        input?: any;
    };
    done: boolean;
    error?: string;
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
    status: 'running' | 'complete' | 'error';
    progress?: string;
    input?: any;
    startTime?: number;
    endTime?: number;
}

// Type guard
export function isStreamingMessage(message: any): message is StreamingMessage {
    return message && 'isStreaming' in message;
}