-- Migration: Add exam_version and version columns to exam_papers table
ALTER TABLE exam_papers ADD COLUMN IF NOT EXISTS exam_version INTEGER DEFAULT 1;
