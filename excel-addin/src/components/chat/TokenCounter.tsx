import React from 'react';
import { TokenUsage } from '../../types/signalr';

interface TokenCounterProps {
  tokenUsage: TokenUsage | null;
}

export const TokenCounter: React.FC<TokenCounterProps> = ({ tokenUsage }) => {
  if (!tokenUsage) return null;

  const percentage = (tokenUsage.total / tokenUsage.max) * 100;
  const progressColor = percentage >= 90 ? 'text-red-500' : 
                       percentage >= 80 ? 'text-yellow-500' : 
                       'text-text-secondary';

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 font-callout text-text-secondary">
      <span className={`${progressColor} transition-colors`}>
        {tokenUsage.total.toLocaleString()} / {tokenUsage.max.toLocaleString()}
      </span>
      <span className="text-text-tertiary text-xs">
        tokens
      </span>
    </div>
  );
};