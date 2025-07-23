const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export const memoryApi = {
  async getStats(sessionId: string) {
    const response = await fetch(`${API_BASE_URL}/api/memory/${sessionId}/stats`);
    if (!response.ok) throw new Error('Failed to fetch memory stats');
    return response.json();
  },

  async uploadDocument(formData: FormData) {
    const response = await fetch(`${API_BASE_URL}/api/memory/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to upload document');
    return response.json();
  },

  async removeDocument(sessionId: string, documentId: string) {
    const response = await fetch(`${API_BASE_URL}/api/memory/${sessionId}/documents/${documentId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to remove document');
    return response.json();
  },

  async reindexWorkbook(sessionId: string) {
    const response = await fetch(`${API_BASE_URL}/api/memory/${sessionId}/reindex`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to start reindexing');
    return response.json();
  },

  async search(sessionId: string, query: string, sourceFilter = 'all', limit = 5) {
    const response = await fetch(`${API_BASE_URL}/api/memory/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        query,
        sourceFilter,
        limit,
      }),
    });
    if (!response.ok) throw new Error('Failed to search memory');
    const data = await response.json();
    return data.results || [];
  },

  async getIndexingProgress(sessionId: string) {
    const response = await fetch(`${API_BASE_URL}/api/memory/${sessionId}/progress`);
    if (!response.ok) throw new Error('Failed to get indexing progress');
    return response.json();
  },
};