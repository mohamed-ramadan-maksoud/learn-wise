-- Migration: Add question_number and meta_data to questions table
ALTER TABLE questions
ADD COLUMN question_number INTEGER;

ALTER TABLE questions
ADD COLUMN meta_data JSONB;

-- Optionally, set default value for meta_data
ALTER TABLE questions
ALTER COLUMN meta_data SET DEFAULT '{}';
