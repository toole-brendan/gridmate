import React from 'react';
import { CheckCircle, Circle, Loader } from 'lucide-react';

interface Task {
  id: string;
  description: string;
  status: 'pending' | 'active' | 'complete';
  progress?: string;
}

interface StreamingStatusBarProps {
  phase: 'initial' | 'tool_execution' | 'continuation' | 'final';
  tasks?: Task[];
  currentAction?: string;
}

export const StreamingStatusBar: React.FC<StreamingStatusBarProps> = ({
  phase,
  tasks = [],
  currentAction
}) => {
  if (phase === 'initial') {
    return (
      <div className="streaming-status-bar initial p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center space-x-2">
        <Loader className="animate-spin text-blue-600" size={16} />
        <span className="text-sm text-blue-700 dark:text-blue-300">Analyzing your request...</span>
      </div>
    );
  }

  if (phase === 'tool_execution' && tasks.length > 0) {
    return (
      <div className="streaming-status-bar tool-execution p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="task-list space-y-1">
          {tasks.map(task => (
            <div key={task.id} className={`task-item flex items-center space-x-2 text-sm ${task.status}`}>
              {task.status === 'complete' && <CheckCircle className="text-green-500" size={14} />}
              {task.status === 'active' && <Loader className="text-blue-500 animate-spin" size={14} />}
              {task.status === 'pending' && <Circle className="text-gray-400" size={14} />}
              <span className={`task-description ${
                task.status === 'complete' ? 'text-gray-600 dark:text-gray-400 line-through' :
                task.status === 'active' ? 'text-gray-900 dark:text-gray-100 font-medium' :
                'text-gray-500 dark:text-gray-400'
              }`}>
                {task.description}
                {task.progress && <span className="text-xs text-gray-500 ml-1">({task.progress})</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'continuation' && currentAction) {
    return (
      <div className="streaming-status-bar continuation p-2 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center space-x-2">
        <Loader className="animate-spin text-gray-600" size={16} />
        <span className="text-sm text-gray-700 dark:text-gray-300">{currentAction}</span>
      </div>
    );
  }

  return null;
};