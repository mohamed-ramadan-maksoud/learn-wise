-- SQL function for pgvector semantic search on tutorials table
CREATE OR REPLACE FUNCTION public.tutorials_vector_search(
  query_embedding vector,
  match_count integer DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title varchar,
  subject varchar,
  chapter varchar,
  paragraph_number integer,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    title,
    subject,
    chapter,
    paragraph_number,
    content,
    1 - (embedding <=> query_embedding) AS similarity
  FROM tutorials
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
