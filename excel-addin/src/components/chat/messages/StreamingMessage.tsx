import React, { useState, useEffect, useRef } from 'react';
import { StreamingMessage as StreamingMessageType } from '../../../types/streaming';
import { ToolIndicator } from './ToolIndicator';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ChunkedRenderer } from '../../../services/streaming/ChunkedRenderer';

interface Props {
    message: StreamingMessageType;
}

export const StreamingMessage: React.FC<Props> = ({ message }) => {
    // Use local state for displayed content
    const [displayContent, setDisplayContent] = useState('');
    const [hasReceivedContent, setHasReceivedContent] = useState(false);
    const [showToolIndicator, setShowToolIndicator] = useState(false);
    const rendererRef = useRef<ChunkedRenderer | null>(null);
    const contentRef = useRef(''); // Track accumulated content
    const processedChunksRef = useRef<Set<string>>(new Set()); // Track processed chunks
    const emptyMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Logging helper
    const log = (action: string, data?: any) => {
        console.log(`[StreamingMessage ${message.id}] ${action}`, {
            timestamp: new Date().toISOString(),
            messageId: message.id,
            isStreaming: message.isStreaming,
            ...data
        });
    };
    
    useEffect(() => {
        log('Mounting component');
        
        // Create renderer on mount
        rendererRef.current = new ChunkedRenderer({
            onUpdate: (content) => {
                // Append delta content
                const previousLength = contentRef.current.length;
                contentRef.current += content;
                const newLength = contentRef.current.length;
                
                log('ChunkedRenderer onUpdate', {
                    deltaContent: content,
                    deltaLength: content.length,
                    previousContentLength: previousLength,
                    newContentLength: newLength,
                    preview: content.substring(0, 50)
                });
                
                setDisplayContent(contentRef.current);
                // Mark that we've received content
                if (content.trim().length > 0) {
                    setHasReceivedContent(true);
                }
            },
            flushInterval: 50, // Faster update rate for smoother streaming
            maxBufferSize: 300  // Smaller buffer for more frequent updates
        });
        
        log('ChunkedRenderer created', {
            flushInterval: 50,
            maxBufferSize: 300
        });
        
        return () => {
            log('Unmounting component - destroying renderer');
            // Cleanup on unmount
            rendererRef.current?.destroy();
            if (emptyMessageTimeoutRef.current) {
                clearTimeout(emptyMessageTimeoutRef.current);
            }
        };
    }, []);
    
    useEffect(() => {
        // Process new chunks
        if (message.chunks && rendererRef.current) {
            log('Processing chunks', {
                totalChunks: message.chunks.length,
                processedChunks: processedChunksRef.current.size
            });
            
            message.chunks.forEach((chunk, index) => {
                // Skip if we've already processed this chunk
                if (processedChunksRef.current.has(chunk.id)) {
                    log('Skipping already processed chunk', {
                        chunkId: chunk.id,
                        chunkIndex: index
                    });
                    return;
                }
                
                log('Processing new chunk', {
                    chunkId: chunk.id,
                    chunkIndex: index,
                    chunkType: chunk.type,
                    hasDelta: !!chunk.delta,
                    deltaLength: chunk.delta?.length || 0,
                    deltaPreview: chunk.delta?.substring(0, 50)
                });
                
                // Mark as processed
                processedChunksRef.current.add(chunk.id);
                
                // Handle text chunks with deltas
                if (chunk.type === 'text' && chunk.delta) {
                    log('Adding chunk to renderer', {
                        chunkId: chunk.id,
                        deltaLength: chunk.delta.length
                    });
                    rendererRef.current?.addChunk(chunk.delta);
                } else if (chunk.type !== 'text') {
                    log('Non-text chunk detected', {
                        chunkId: chunk.id,
                        chunkType: chunk.type
                    });
                }
            });
        }
        
        // Force flush when streaming completes
        if (!message.isStreaming && rendererRef.current) {
            log('Streaming completed - forcing flush');
            rendererRef.current.forceFlush();
        }
    }, [message.chunks, message.isStreaming]);
    
    // Reset content when message ID changes (new message)
    useEffect(() => {
        if (message.id) {
            log('Message ID changed - resetting content', {
                previousContentLength: contentRef.current.length,
                processedChunksCount: processedChunksRef.current.size
            });
            
            contentRef.current = '';
            setDisplayContent('');
            processedChunksRef.current.clear();
            setHasReceivedContent(false);
            setShowToolIndicator(false);
        }
    }, [message.id]);
    
    // Empty message detection
    useEffect(() => {
        // Only check for empty messages if we're streaming
        if (message.isStreaming && !hasReceivedContent) {
            // Clear any existing timeout
            if (emptyMessageTimeoutRef.current) {
                clearTimeout(emptyMessageTimeoutRef.current);
            }
            
            // Set timeout to show fallback text
            emptyMessageTimeoutRef.current = setTimeout(() => {
                if (!hasReceivedContent && message.isStreaming) {
                    log('No content received after 1s - showing fallback');
                    setDisplayContent("Working on your request...");
                    setShowToolIndicator(true);
                }
            }, 1000); // 1 second timeout
        } else if (!message.isStreaming && !hasReceivedContent && message.toolCalls && message.toolCalls.length > 0) {
            // If streaming ended but no content was received and there were tool calls
            log('Streaming ended with no content but with tool calls');
            setDisplayContent("I've completed the operations on your spreadsheet.");
        }
        
        // Clear timeout when we receive content or stop streaming
        if (hasReceivedContent || !message.isStreaming) {
            if (emptyMessageTimeoutRef.current) {
                clearTimeout(emptyMessageTimeoutRef.current);
            }
        }
        
        return () => {
            if (emptyMessageTimeoutRef.current) {
                clearTimeout(emptyMessageTimeoutRef.current);
            }
        };
    }, [message.isStreaming, hasReceivedContent, message.toolCalls]);
    
    return (
        <div className="flex items-start space-x-3 p-4 animate-fadeIn">
            {/* Avatar */}
            <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center">
                    <span className="text-white font-caption">AI</span>
                </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 space-y-2 min-w-0">
                {/* Message content with typing indicator */}
                <div className="font-callout text-text-primary whitespace-pre-wrap">
                    <ReactMarkdown
                        components={{
                            // Paragraph styling
                            p: ({ children }) => (
                                <p className="mb-2 last:mb-0">{children}</p>
                            ),
                            // Heading styles
                            h1: ({ children }) => (
                                <h1 className="font-semibold text-base mb-2 mt-3 first:mt-0">{children}</h1>
                            ),
                            h2: ({ children }) => (
                                <h2 className="font-semibold text-sm mb-2 mt-3 first:mt-0">{children}</h2>
                            ),
                            h3: ({ children }) => (
                                <h3 className="font-semibold mb-1 mt-2 first:mt-0">{children}</h3>
                            ),
                            // List styles
                            ul: ({ children }) => (
                                <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
                            ),
                            ol: ({ children }) => (
                                <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
                            ),
                            li: ({ children }) => (
                                <li className="ml-2">{children}</li>
                            ),
                            // Link styles
                            a: ({ href, children }) => (
                                <a href={href} className="text-accent-primary hover:underline" target="_blank" rel="noopener noreferrer">
                                    {children}
                                </a>
                            ),
                            // Code styles
                            code({ node, className, children, ...props }: any) {
                                const match = /language-(\w+)/.exec(className || '');
                                const inline = !className || !match;
                                return !inline ? (
                                    <div className="my-2">
                                        <SyntaxHighlighter
                                            style={oneDark as any}
                                            language={match[1]}
                                            PreTag="div"
                                            customStyle={{
                                                fontSize: '11px',
                                                padding: '12px',
                                                borderRadius: '6px',
                                                margin: 0
                                            }}
                                            {...props}
                                        >
                                            {String(children).replace(/\n$/, '')}
                                        </SyntaxHighlighter>
                                    </div>
                                ) : (
                                    <code className="bg-secondary-background px-1 py-0.5 rounded text-[11px] font-mono" {...props}>
                                        {children}
                                    </code>
                                );
                            },
                            // Blockquote styles
                            blockquote: ({ children }) => (
                                <blockquote className="border-l-4 border-border-primary pl-3 my-2 text-text-secondary italic">
                                    {children}
                                </blockquote>
                            ),
                            // Table styles
                            table: ({ children }) => (
                                <div className="overflow-x-auto my-2">
                                    <table className="min-w-full border-collapse">{children}</table>
                                </div>
                            ),
                            th: ({ children }) => (
                                <th className="border border-border-primary px-2 py-1 bg-secondary-background font-medium text-left">
                                    {children}
                                </th>
                            ),
                            td: ({ children }) => (
                                <td className="border border-border-primary px-2 py-1">{children}</td>
                            ),
                        }}
                    >
                        {displayContent}
                    </ReactMarkdown>
                    
                    {/* Improved typing indicator */}
                    {message.isStreaming && (
                        <span className="inline-block ml-1">
                            <span className="animate-pulse text-blue-500">▊</span>
                        </span>
                    )}
                    
                    {/* Tool operation indicator for empty messages */}
                    {showToolIndicator && !hasReceivedContent && (
                        <div className="mt-2 flex items-center space-x-2 text-sm text-text-secondary">
                            <svg className="animate-spin h-4 w-4 text-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Processing your request...</span>
                        </div>
                    )}
                </div>
                
                {/* Tool indicators */}
                {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="space-y-2 mt-3">
                        {message.toolCalls.map((tool) => (
                            <ToolIndicator 
                                key={tool.id} 
                                tool={tool} 
                                isStreaming={message.isStreaming}
                            />
                        ))}
                    </div>
                )}
                
                {/* Streaming stats (dev mode) */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="text-xs text-gray-400 mt-2 space-y-1">
                        {message.streamEndTime && (
                            <div>Stream duration: {message.streamEndTime - (message.streamStartTime || 0)}ms</div>
                        )}
                        <div>Content length: {displayContent.length} chars</div>
                        <div>Chunks processed: {processedChunksRef.current.size}</div>
                        <div>Is streaming: {message.isStreaming ? 'Yes' : 'No'}</div>
                    </div>
                )}
            </div>
        </div>
    );
};