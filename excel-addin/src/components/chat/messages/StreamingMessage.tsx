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
    const rendererRef = useRef<ChunkedRenderer | null>(null);
    const contentRef = useRef(''); // Track accumulated content
    const processedChunksRef = useRef<Set<string>>(new Set()); // Track processed chunks
    
    useEffect(() => {
        // Create renderer on mount
        rendererRef.current = new ChunkedRenderer({
            onUpdate: (content) => {
                // Append delta content
                contentRef.current += content;
                setDisplayContent(contentRef.current);
            },
            flushInterval: 50, // Faster update rate for smoother streaming
            maxBufferSize: 300  // Smaller buffer for more frequent updates
        });
        
        return () => {
            // Cleanup on unmount
            rendererRef.current?.destroy();
        };
    }, []);
    
    useEffect(() => {
        // Process new chunks
        if (message.chunks && rendererRef.current) {
            message.chunks.forEach((chunk) => {
                // Skip if we've already processed this chunk
                if (processedChunksRef.current.has(chunk.id)) {
                    return;
                }
                
                // Mark as processed
                processedChunksRef.current.add(chunk.id);
                
                // Handle text chunks with deltas
                if (chunk.type === 'text' && chunk.delta) {
                    rendererRef.current.addChunk(chunk.delta);
                }
            });
        }
        
        // Force flush when streaming completes
        if (!message.isStreaming && rendererRef.current) {
            rendererRef.current.forceFlush();
        }
    }, [message.chunks, message.isStreaming]);
    
    // Reset content when message ID changes (new message)
    useEffect(() => {
        if (message.id) {
            contentRef.current = '';
            setDisplayContent('');
            processedChunksRef.current.clear();
        }
    }, [message.id]);
    
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
                {process.env.NODE_ENV === 'development' && message.streamEndTime && (
                    <div className="text-xs text-gray-400 mt-2">
                        Stream duration: {message.streamEndTime - (message.streamStartTime || 0)}ms
                    </div>
                )}
            </div>
        </div>
    );
};