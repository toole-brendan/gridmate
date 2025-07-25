import React, { useState } from 'react';
import { Upload, File, Trash2, RefreshCw, Search, Database } from 'lucide-react';
import { useMemoryStore } from '../../stores/memoryStore';
import { formatBytes } from '../../utils/formatters';

interface MemoryPanelProps {
  sessionId: string;
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({ sessionId }) => {
  const {
    stats,
    documents,
    indexingProgress,
    uploadDocument,
    removeDocument,
    reindexWorkbook,
    searchMemory,
  } = useMemoryStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      await uploadDocument(sessionId, file);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    const results = await searchMemory(sessionId, searchQuery);
    setSearchResults(results);
  };
  
  return (
    <div className="memory-panel p-4 space-y-4">
      {/* Memory Stats */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Database className="w-4 h-4" />
            Memory Usage
          </h3>
          <button
            onClick={() => reindexWorkbook(sessionId)}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            disabled={indexingProgress?.status === 'running'}
          >
            <RefreshCw className={`w-3 h-3 ${indexingProgress?.status === 'running' ? 'animate-spin' : ''}`} />
            Reindex
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Total chunks:</span>
            <span className="ml-1 font-medium">{stats?.totalChunks || 0}</span>
          </div>
          <div>
            <span className="text-gray-500">Spreadsheet:</span>
            <span className="ml-1 font-medium">{stats?.spreadsheetChunks || 0}</span>
          </div>
          <div>
            <span className="text-gray-500">Documents:</span>
            <span className="ml-1 font-medium">{stats?.documentChunks || 0}</span>
          </div>
          <div>
            <span className="text-gray-500">Chat history:</span>
            <span className="ml-1 font-medium">{stats?.chatChunks || 0}</span>
          </div>
        </div>
        
        {indexingProgress?.status === 'running' && (
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1">
              <span>Indexing...</span>
              <span>{indexingProgress.processedItems}/{indexingProgress.totalItems}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className="bg-blue-600 h-1 rounded-full transition-all"
                style={{ width: `${(indexingProgress.processedItems / indexingProgress.totalItems) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Document Management */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Reference Documents</h3>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
            <div className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
              <Upload className="w-3 h-3" />
              Upload
            </div>
          </label>
        </div>
        
        <div className="space-y-1">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <File className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="text-sm font-medium">{doc.name}</div>
                  <div className="text-xs text-gray-500">
                    {formatBytes(doc.size)} • {doc.chunks} chunks
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeDocument(sessionId, doc.id)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          {documents.length === 0 && (
            <div className="text-xs text-gray-500 text-center py-4">
              No documents uploaded yet
            </div>
          )}
        </div>
      </div>
      
      {/* Memory Search */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Search Memory</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search across all indexed content..."
            className="flex-1 px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
        
        {searchResults.length > 0 && (
          <div className="mt-2 space-y-2">
            {searchResults.map((result, idx) => (
              <div key={idx} className="p-2 bg-gray-50 rounded text-xs">
                <div className="font-medium text-gray-700">
                  [{result.source}] {result.similarity}% match
                </div>
                <div className="text-gray-600 mt-1">{result.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};