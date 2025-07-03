-- Migration: Add exam_mode to exam_papers table
ALTER TABLE exam_papers ADD COLUMN IF NOT EXISTS exam_mode VARCHAR(10) DEFAULT 'real' CHECK (exam_mode IN ('real', 'mock', 'guide'));
