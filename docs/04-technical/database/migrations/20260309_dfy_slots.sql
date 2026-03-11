-- Add selected_time_slots (array) to dfy_match_notifications
-- Nannies now select ALL available slots instead of one
ALTER TABLE dfy_match_notifications
ADD COLUMN IF NOT EXISTS selected_time_slots TEXT[] DEFAULT '{}';
