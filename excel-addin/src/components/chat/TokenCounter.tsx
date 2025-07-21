import React from 'react';
import { TokenUsage } from '../../types/signalr';

interface TokenCounterProps {
  tokenUsage: TokenUsage | null;
}

export const TokenCounter: React.FC<TokenCounterProps> = ({ tokenUsage }) => {
  if (!tokenUsage) return null;

  const percentage = (tokenUsage.total / tokenUsage.max) * 100;
  const progressColor = percentage >= 90 ? 'bg-red-500' : 
                       percentage >= 80 ? 'bg-yellow-500' : 
                       'bg-blue-500';

  return (
    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs">
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-700">
          Context: {tokenUsage.total.toLocaleString()} / {tokenUsage.max.toLocaleString()} tokens
          {' '}
          <span className="text-gray-500">
            (↑{tokenUsage.input.toLocaleString()}, ↓{tokenUsage.output.toLocaleString()})
          </span>
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1">
        <div 
          className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};