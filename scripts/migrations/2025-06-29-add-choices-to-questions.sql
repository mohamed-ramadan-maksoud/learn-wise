-- Migration: Add 'tags' and 'choices' columns to 'questions' table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS choices TEXT[] DEFAULT '{}';

UPDATE questions SET choices = tags WHERE tags IS NOT NULL;
