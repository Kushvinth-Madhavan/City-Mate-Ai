-- Enable the vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create tables for storing embeddings

-- User profile table with embedding
CREATE TABLE IF NOT EXISTS user_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE,
  profile_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding VECTOR(768),  -- Adjust dimension to match Gemini embedding size
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversation history table with embedding
CREATE TABLE IF NOT EXISTS conversation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  embedding VECTOR(768),  -- Adjust dimension to match Gemini embedding size
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- City preferences table with embedding
CREATE TABLE IF NOT EXISTS city_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  city_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  embedding VECTOR(768),  -- Adjust dimension to match Gemini embedding size
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for similarity search
CREATE INDEX IF NOT EXISTS user_profile_embedding_idx ON user_profile USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS conversation_history_embedding_idx ON conversation_history USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS city_preferences_embedding_idx ON city_preferences USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create functions for similarity search
CREATE OR REPLACE FUNCTION match_user_profiles(
  query_embedding VECTOR(768),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  user_id TEXT,
  profile_data JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.id,
    up.user_id,
    up.profile_data,
    1 - (up.embedding <=> query_embedding) AS similarity
  FROM user_profile up
  WHERE 1 - (up.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION match_conversation_history(
  query_embedding VECTOR(768),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  user_id TEXT,
  messages JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ch.id,
    ch.user_id,
    ch.messages,
    1 - (ch.embedding <=> query_embedding) AS similarity
  FROM conversation_history ch
  WHERE 1 - (ch.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION match_city_preferences(
  query_embedding VECTOR(768),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  user_id TEXT,
  city_data JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id,
    cp.user_id,
    cp.city_data,
    1 - (cp.embedding <=> query_embedding) AS similarity
  FROM city_preferences cp
  WHERE 1 - (cp.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$; 