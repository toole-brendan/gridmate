import React from 'react';
import { TokenUsage } from '../../types/signalr';

interface TokenCounterProps {
  tokenUsage: TokenUsage | null;
}

export const TokenCounter: React.FC<TokenCounterProps> = ({ tokenUsage }) => {
  // Use default values when tokenUsage is null
  const usage = tokenUsage || {
    input: 0,
    output: 0,
    total: 0,
    max: 200000
  };

  const percentage = (usage.total / usage.max) * 100;
  const progressColor = percentage >= 90 ? 'text-red-500' : 
                       percentage >= 80 ? 'text-yellow-500' : 
                       'text-text-secondary';

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 font-callout text-text-secondary">
      <span className={`${progressColor} transition-colors`}>
        {usage.total.toLocaleString()} / {usage.max.toLocaleString()}
      </span>
      <span className="text-text-tertiary text-xs">
        tokens
      </span>
    </div>
  );
};