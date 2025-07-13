-- Enable pgvector extension for vector embeddings
-- Note: Azure PostgreSQL doesn't support pgvector extension by default
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table for storing financial documents
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50), -- PDF, DOCX, TXT, etc.
    file_path VARCHAR(500),
    file_size BIGINT,
    checksum VARCHAR(64), -- SHA256 hash for deduplication
    metadata JSONB DEFAULT '{}',
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create document_chunks table for RAG
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    -- embedding vector(1536), -- OpenAI embedding dimension, adjust for other models
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id, chunk_index)
);

-- Create embeddings table for conversation context
CREATE TABLE IF NOT EXISTS conversation_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    -- embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for vector similarity search
-- Commented out since vector extension is not available
-- CREATE INDEX idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);
-- CREATE INDEX idx_conversation_embeddings_embedding ON conversation_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Regular indexes
CREATE INDEX idx_documents_workspace ON documents(workspace_id);
CREATE INDEX idx_documents_checksum ON documents(checksum);
CREATE INDEX idx_document_chunks_document ON document_chunks(document_id);

-- Add updated_at trigger for documents
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();