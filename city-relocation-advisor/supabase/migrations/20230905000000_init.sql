-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create tables for storing user data and conversation history
CREATE TABLE IF NOT EXISTS user_profile (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  profile_data JSONB NOT NULL DEFAULT '{}',
  embedding VECTOR(1536),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT user_profile_user_id_key UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS conversation_history (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  embedding VECTOR(1536),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT conversation_history_user_id_key UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS city_preferences (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  city_data JSONB NOT NULL DEFAULT '{}',
  embedding VECTOR(1536),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT city_preferences_user_id_key UNIQUE (user_id)
);

-- Create RPC functions to ensure tables exist
CREATE OR REPLACE FUNCTION create_user_profile_table_if_not_exists()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_profile') THEN
    CREATE TABLE user_profile (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      profile_data JSONB NOT NULL DEFAULT '{}',
      embedding VECTOR(1536),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT user_profile_user_id_key UNIQUE (user_id)
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_conversation_history_table_if_not_exists()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'conversation_history') THEN
    CREATE TABLE conversation_history (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      messages JSONB NOT NULL DEFAULT '[]',
      embedding VECTOR(1536),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT conversation_history_user_id_key UNIQUE (user_id)
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_city_preferences_table_if_not_exists()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'city_preferences') THEN
    CREATE TABLE city_preferences (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      city_data JSONB NOT NULL DEFAULT '{}',
      embedding VECTOR(1536),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT city_preferences_user_id_key UNIQUE (user_id)
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create vector search functions
CREATE OR REPLACE FUNCTION match_user_profiles(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id INT,
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
  ORDER BY up.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION match_conversation_history(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id INT,
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
  ORDER BY ch.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION match_city_preferences(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id INT,
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
  ORDER BY cp.embedding <=> query_embedding
  LIMIT match_count;
END;
$$; 