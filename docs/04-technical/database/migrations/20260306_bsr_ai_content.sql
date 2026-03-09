-- Migration: Add ai_content JSONB column to babysitting_requests
-- Date: 2026-03-06
-- Purpose: Store template/AI-generated Facebook share post content for viral loop

ALTER TABLE babysitting_requests ADD COLUMN IF NOT EXISTS ai_content JSONB;

COMMENT ON COLUMN babysitting_requests.ai_content IS 'Template/AI-generated content for viral share posts (share_post, generated_at)';
