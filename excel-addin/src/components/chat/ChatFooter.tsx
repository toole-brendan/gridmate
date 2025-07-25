import React from 'react';
import { Download, Copy, DollarSign, Cpu } from 'lucide-react';

interface ChatFooterProps {
  modelName?: string;
  tokenCount?: number;
  estimatedCost?: number;
  onExport: (format: 'markdown' | 'pdf') => void;
  onDuplicate: () => void;
}

export const ChatFooter: React.FC<ChatFooterProps> = ({
  modelName,
  tokenCount,
  estimatedCost,
  onExport,
  onDuplicate
}) => {
  return (
    <div className="chat-footer flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <div className="footer-info flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
        {modelName && (
          <div className="model-info flex items-center space-x-1">
            <Cpu size={14} />
            <span>{modelName}</span>
          </div>
        )}
        {tokenCount && (
          <div className="token-info">
            <span>{tokenCount.toLocaleString()} tokens</span>
          </div>
        )}
        {estimatedCost !== undefined && (
          <div className="cost-info flex items-center space-x-1">
            <DollarSign size={14} />
            <span>${estimatedCost.toFixed(4)}</span>
          </div>
        )}
      </div>
      
      <div className="footer-actions flex items-center space-x-2">
        <button 
          onClick={() => onExport('markdown')} 
          title="Export to Markdown"
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <Download size={16} />
        </button>
        <button 
          onClick={onDuplicate} 
          title="Duplicate Chat"
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <Copy size={16} />
        </button>
      </div>
    </div>
  );
};