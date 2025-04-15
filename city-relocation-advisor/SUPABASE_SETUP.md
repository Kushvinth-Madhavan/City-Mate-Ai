# Setting Up the Vector Store in Supabase

This guide will help you set up the vector database in Supabase for storing embeddings used in the City Relocation Advisor application.

## Prerequisites

1. A Supabase account and project
2. Access to the SQL editor in your Supabase project

## Steps to Set Up the Vector Store

### 1. Enable the pgvector Extension

In your Supabase project:

1. Go to the SQL editor
2. Run the following command:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Create the Required Tables and Functions

Use the provided SQL file to create the necessary tables and functions:

1. Go to the SQL editor in your Supabase project
2. Open the `setup-vector-store.sql` file from this repository
3. Run the entire SQL script

Alternatively, you can copy and paste the contents of the SQL file into the SQL editor.

### 3. Verify the Setup

After running the SQL script, you should have the following tables:

- `user_profile`: Stores user profiles with embeddings
- `conversation_history`: Stores conversation history with embeddings
- `city_preferences`: Stores city preferences with embeddings

And the following functions:

- `match_user_profiles`: For semantic search in user profiles
- `match_conversation_history`: For semantic search in conversation history
- `match_city_preferences`: For semantic search in city preferences

### 4. Update Environment Variables

Make sure your `.env.local` file contains the following variables:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-service-role-key
```

## Embedding Vector Dimension

The default configuration uses a vector dimension of 768, which is typical for Gemini embeddings. If your model outputs embeddings with a different dimension, you'll need to adjust the `VECTOR(768)` size in the SQL script.

## Testing the Vector Store

You can test the vector store by running a simple query:

```sql
SELECT * FROM user_profile LIMIT 5;
SELECT * FROM conversation_history LIMIT 5;
SELECT * FROM city_preferences LIMIT 5;
```

## Troubleshooting

### Common Issues:

1. **"ERROR: relation does not exist"** - Make sure you've run the SQL script to create all the tables.

2. **"ERROR: type "vector" does not exist"** - Ensure the pgvector extension is properly installed.

3. **"ERROR: function match_user_profiles does not exist"** - Verify that you've run the entire SQL script including the function definitions.

4. **Connection issues** - Double-check your Supabase URL and key in the environment variables. 