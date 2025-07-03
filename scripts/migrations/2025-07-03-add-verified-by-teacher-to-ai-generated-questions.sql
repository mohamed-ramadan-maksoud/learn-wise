-- Migration: Add verified_by_teacher to ai_generated_questions table
ALTER TABLE ai_generated_questions ADD COLUMN IF NOT EXISTS verified_by_teacher BOOLEAN DEFAULT FALSE;
