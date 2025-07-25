import React from 'react';
import { CheckCircle, XCircle, Loader, Clock, AlertCircle } from 'lucide-react';
import { StreamingToolCall } from '../../../types/streaming';

interface Props {
    tool: StreamingToolCall;
    isStreaming: boolean;
    queuePosition?: number;
}

export const ToolIndicator: React.FC<Props> = ({ tool, queuePosition }) => {
    const getIcon = () => {
        switch (tool.status) {
            case 'complete':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'error':
                return <XCircle className="w-4 h-4 text-red-500" />;
            case 'queued':
                return <Clock className="w-4 h-4 text-yellow-500" />;
            case 'running':
                return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
            default:
                return <AlertCircle className="w-4 h-4 text-gray-500" />;
        }
    };
    
    const getStatusText = () => {
        switch (tool.status) {
            case 'complete':
                return 'Completed';
            case 'error':
                return 'Failed';
            case 'queued':
                return 'Queued for approval';
            case 'running':
                return 'Executing...';
            default:
                return 'Preparing...';
        }
    };
    
    const getToolDescription = (toolName: string): string => {
        const descriptions: Record<string, string> = {
            'read_range': 'Reading spreadsheet data',
            'write_range': 'Writing to cells',
            'apply_formula': 'Applying formula',
            'format_range': 'Formatting cells',
            'clear_range': 'Clearing cells',
            'smart_format_cells': 'Smart formatting',
            'create_chart': 'Creating chart',
            'validate_model': 'Validating model',
            'analyze_data': 'Analyzing data',
            'create_named_range': 'Creating named range',
            'insert_rows_columns': 'Modifying structure',
            'build_financial_formula': 'Building formula',
            'organize_financial_model': 'Organizing model'
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
    
    const getBackgroundColor = () => {
        switch (tool.status) {
            case 'complete':
                return 'bg-green-50 border-green-200';
            case 'error':
                return 'bg-red-50 border-red-200';
            case 'queued':
                return 'bg-yellow-50 border-yellow-200';
            case 'running':
                return 'bg-blue-50 border-blue-200';
            default:
                return 'bg-gray-50 border-gray-200';
        }
    };
    
    return (
        <div className={`
            flex items-center justify-between text-sm rounded-lg px-3 py-2
            transition-all duration-200 border
            ${getBackgroundColor()}
            ${tool.status === 'running' ? 'shadow-sm animate-pulse' : ''}
            ${tool.status === 'complete' ? 'opacity-75' : ''}
        `}>
            <div className="flex items-center space-x-2">
                {getIcon()}
                <div className="flex flex-col">
                    <span className="font-medium text-gray-700">
                        {getToolDescription(tool.name)}
                    </span>
                    <span className="text-xs text-gray-500">
                        {getStatusText()}
                        {queuePosition && tool.status === 'queued' && (
                            <span className="ml-1">
                                (Position: {queuePosition})
                            </span>
                        )}
                    </span>
                </div>
            </div>
            
            <div className="flex items-center space-x-2">
                {tool.progress && tool.status === 'running' && (
                    <span className="text-xs text-gray-500">
                        {tool.progress}
                    </span>
                )}
                
                {tool.status === 'complete' && getDuration() && (
                    <span className="text-xs text-gray-400">
                        {getDuration()}
                    </span>
                )}
                
                {tool.status === 'error' && tool.error && (
                    <span className="text-xs text-red-600" title={tool.error}>
                        Error
                    </span>
                )}
            </div>
        </div>
    );
};