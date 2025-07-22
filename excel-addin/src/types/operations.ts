export interface PendingAction {
  id: string;
  type: string;
  description: string;
  input: Record<string, any>;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  batchId?: string;
  dependencies?: string[];
  priority?: number;
  preview?: string;
  context?: string;
  canAccept?: boolean; // From backend's CanExecute check
  error?: string; // Error message if failed
  result?: any; // Result of completed operation
}

export interface OperationBatch {
  id: string;
  size: number;
  ready_count: number;
  can_accept_all: boolean;
}

export interface OperationSummary {
  counts: {
    queued?: number;
    in_progress?: number;
    completed?: number;
    failed?: number;
    cancelled?: number;
  };
  pending: PendingAction[];
  total: number;
  has_blocked: boolean;
  batches?: OperationBatch[];
}

export interface OperationDependency {
  from: string;
  to: string;
  type: 'requires' | 'blocks' | 'related';
}

// Backend operation status enum
export enum OperationStatus {
  Queued = 'queued',
  InProgress = 'in_progress',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
} 