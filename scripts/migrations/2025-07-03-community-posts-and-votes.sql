-- Migration: Create posts table and update votes table for community features

-- 1. Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  post_type VARCHAR(20) NOT NULL CHECK (post_type IN ('discussion', 'question', 'announcement')),
  question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (
    (post_type = 'question' AND question_id IS NOT NULL) OR
    (post_type IN ('discussion', 'announcement') AND question_id IS NULL)
  )
);

-- 2. Update votes table to allow voting on posts
DROP TABLE IF EXISTS votes CASCADE;
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  vote_type VARCHAR(20) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, question_id),
  UNIQUE(user_id, post_id),
  CHECK (
    (post_id IS NOT NULL AND question_id IS NULL) OR
    (post_id IS NULL AND question_id IS NOT NULL)
  )
);

-- Notes:
-- - Each user can vote only once per post or question.
-- - Only one of post_id or question_id is non-null per vote.
-- - Posts can be general or linked to a question (not creating a new question).
