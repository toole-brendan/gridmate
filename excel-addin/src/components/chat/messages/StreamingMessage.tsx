import React from 'react';
import { StreamingMessage as StreamingMessageType } from '../../../types/streaming';
import { ToolIndicator } from './ToolIndicator';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Props {
    message: StreamingMessageType;
}

export const StreamingMessage: React.FC<Props> = ({ message }) => {
    return (
        <div className="flex items-start space-x-3 p-4 animate-fadeIn">
            {/* Avatar */}
            <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">AI</span>
                </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 space-y-2 min-w-0">
                {/* Message content with typing indicator */}
                <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                        components={{
                            code({ node, inline, className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline && match ? (
                                    <SyntaxHighlighter
                                        style={oneDark}
                                        language={match[1]}
                                        PreTag="div"
                                        {...props}
                                    >
                                        {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                ) : (
                                    <code className={className} {...props}>
                                        {children}
                                    </code>
                                );
                            }
                        }}
                    >
                        {message.content}
                    </ReactMarkdown>
                    
                    {/* Typing indicator */}
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