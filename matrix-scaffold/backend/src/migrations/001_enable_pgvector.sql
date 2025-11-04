-- Migration: Enable pgvector extension
-- Run this SQL script to enable pgvector for vector search

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Update memory table to use pgvector
-- Note: This assumes the memory table already exists
-- If not, run Prisma migrations first

-- Add vector column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'memory' AND column_name = 'embedding'
    ) THEN
        ALTER TABLE memory ADD COLUMN embedding vector(256);
    END IF;
END $$;

-- Create HNSW index for fast similarity search
-- This will significantly improve search performance
CREATE INDEX IF NOT EXISTS memory_embedding_idx 
ON memory 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create index on projectId for filtering
CREATE INDEX IF NOT EXISTS memory_project_id_idx ON memory("projectId");

-- Create index on createdAt for sorting
CREATE INDEX IF NOT EXISTS memory_created_at_idx ON memory("createdAt");

COMMENT ON COLUMN memory.embedding IS 'Vector embedding for semantic search using pgvector';
COMMENT ON INDEX memory_embedding_idx IS 'HNSW index for fast approximate nearest neighbor search';

