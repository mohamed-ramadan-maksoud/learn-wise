-- Migration: Add question_answer column to questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_answer TEXT;
