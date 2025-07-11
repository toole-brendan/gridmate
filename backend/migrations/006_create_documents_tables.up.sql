-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 10-K, 10-Q, 8-K, etc
    source VARCHAR(100) NOT NULL, -- SEC EDGAR, Manual Upload, etc
    url TEXT,
    company_name VARCHAR(255),
    ticker VARCHAR(10),
    filing_date TIMESTAMP,
    period_end TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create embeddings table
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI/Claude embedding dimension
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_company_name ON documents(company_name);
CREATE INDEX idx_documents_filing_date ON documents(filing_date DESC);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);

-- Create unique index on chunk_id within a document
CREATE UNIQUE INDEX idx_embeddings_document_chunk ON embeddings(document_id, chunk_id);

-- Create vector similarity search index
CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create GIN index for metadata search
CREATE INDEX idx_documents_metadata ON documents USING gin(metadata);
CREATE INDEX idx_embeddings_metadata ON embeddings USING gin(metadata);

-- Create full text search indexes
CREATE INDEX idx_documents_title_text ON documents USING gin(to_tsvector('english', title));
CREATE INDEX idx_embeddings_content_text ON embeddings USING gin(to_tsvector('english', content));

-- Add triggers for updated_at
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();