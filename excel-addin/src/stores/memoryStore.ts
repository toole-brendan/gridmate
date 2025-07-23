import { create } from 'zustand';
import { memoryApi } from '../api/memory';

interface MemoryStats {
  totalChunks: number;
  spreadsheetChunks: number;
  documentChunks: number;
  chatChunks: number;
  lastIndexed: Date;
}

interface Document {
  id: string;
  name: string;
  size: number;
  chunks: number;
  uploadedAt: Date;
}

interface IndexingProgress {
  status: 'pending' | 'running' | 'completed' | 'failed';
  processedItems: number;
  totalItems: number;
}

interface MemoryStore {
  stats: MemoryStats | null;
  documents: Document[];
  indexingProgress: IndexingProgress | null;
  
  // Actions
  fetchStats: (sessionId: string) => Promise<void>;
  uploadDocument: (sessionId: string, file: File) => Promise<void>;
  removeDocument: (sessionId: string, docId: string) => Promise<void>;
  reindexWorkbook: (sessionId: string) => Promise<void>;
  searchMemory: (sessionId: string, query: string) => Promise<any[]>;
  
  // Real-time updates
  updateIndexingProgress: (progress: IndexingProgress) => void;
}

export const useMemoryStore = create<MemoryStore>((set, get) => ({
  stats: null,
  documents: [],
  indexingProgress: null,
  
  fetchStats: async (sessionId) => {
    try {
      const stats = await memoryApi.getStats(sessionId);
      set({ stats });
    } catch (error) {
      console.error('Failed to fetch memory stats:', error);
    }
  },
  
  uploadDocument: async (sessionId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', sessionId);
    
    try {
      const response = await memoryApi.uploadDocument(formData);
      
      // Add to documents list
      set((state) => ({
        documents: [...state.documents, {
          id: response.documentId,
          name: file.name,
          size: file.size,
          chunks: response.chunks || 0,
          uploadedAt: new Date(),
        }],
      }));
      
      // Refresh stats
      get().fetchStats(sessionId);
    } catch (error) {
      console.error('Failed to upload document:', error);
      throw error;
    }
  },
  
  removeDocument: async (sessionId, docId) => {
    try {
      await memoryApi.removeDocument(sessionId, docId);
      
      // Remove from list
      set((state) => ({
        documents: state.documents.filter(d => d.id !== docId),
      }));
      
      // Refresh stats
      get().fetchStats(sessionId);
    } catch (error) {
      console.error('Failed to remove document:', error);
    }
  },
  
  reindexWorkbook: async (sessionId) => {
    try {
      await memoryApi.reindexWorkbook(sessionId);
      
      // Progress will be updated via WebSocket/SignalR
      set({ indexingProgress: { status: 'pending', processedItems: 0, totalItems: 0 } });
    } catch (error) {
      console.error('Failed to start reindexing:', error);
    }
  },
  
  searchMemory: async (sessionId, query) => {
    try {
      const results = await memoryApi.search(sessionId, query);
      return results;
    } catch (error) {
      console.error('Memory search failed:', error);
      return [];
    }
  },
  
  updateIndexingProgress: (progress) => {
    set({ indexingProgress: progress });
    
    // Clear progress after completion
    if (progress.status === 'completed' || progress.status === 'failed') {
      setTimeout(() => {
        set({ indexingProgress: null });
      }, 3000);
    }
  },
}));