-- Drop tables in reverse order of creation
DROP TABLE IF EXISTS conversation_embeddings;
DROP TABLE IF EXISTS document_chunks;
DROP TABLE IF EXISTS documents;

-- Note: We don't drop the vector extension as it might be used by other applications