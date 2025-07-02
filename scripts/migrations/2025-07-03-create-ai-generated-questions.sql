-- Migration: Create ai_generated_questions table
CREATE TABLE IF NOT EXISTS ai_generated_questions (
  id UUID PRIMARY KEY,
  parent_exam_q_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  subject VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  choices TEXT[] NOT NULL,
  answer TEXT NOT NULL,
  ai_search_type VARCHAR(20) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

