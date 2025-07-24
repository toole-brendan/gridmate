import React from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { StreamingToolCall } from '../../../types/streaming';

interface Props {
    tool: StreamingToolCall;
    isStreaming: boolean;
}

export const ToolIndicator: React.FC<Props> = ({ tool, isStreaming }) => {
    const getIcon = () => {
        switch (tool.status) {
            case 'complete':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'error':
                return <XCircle className="w-4 h-4 text-red-500" />;
            default:
                return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
        }
    };
    
    const getToolDescription = (toolName: string): string => {
        const descriptions: Record<string, string> = {
            'read_range': 'Reading spreadsheet data',
            'write_range': 'Writing to cells',
            'apply_formula': 'Applying formula',
            'format_range': 'Formatting cells',
            'clear_range': 'Clearing cells',
            'smart_format_cells': 'Smart formatting'
        };
        return descriptions[toolName] || toolName;
    };
    
    const getDuration = () => {
        if (tool.endTime && tool.startTime) {
            const duration = tool.endTime - tool.startTime;
            return `${(duration / 1000).toFixed(1)}s`;
        }
        return null;
    };
    
    return (
        <div className={`
            flex items-center space-x-2 text-sm bg-gray-50 rounded-lg px-3 py-2
            transition-all duration-200
            ${tool.status === 'running' ? 'shadow-sm border border-blue-200' : ''}
            ${tool.status === 'complete' ? 'opacity-75' : ''}
        `}>
            {getIcon()}
            <span className="font-medium text-gray-700">
                {getToolDescription(tool.name)}
            </span>
            
            {tool.progress && tool.status === 'running' && (
                <span className="text-xs text-gray-500 ml-auto">
                    {tool.progress}
                </span>
            )}
            
            {tool.status === 'complete' && getDuration() && (
                <span className="text-xs text-gray-400 ml-auto">
                    {getDuration()}
                </span>
            )}
        </div>
    );
};