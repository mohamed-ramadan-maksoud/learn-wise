-- Migration: Add exam_type and region columns to exams table
ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_type VARCHAR(16) DEFAULT 'final';
ALTER TABLE exams ADD COLUMN IF NOT EXISTS region VARCHAR(32) DEFAULT 'egypt';
