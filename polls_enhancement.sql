-- Enhanced polls schema to support correct answers, timing, and queuing

-- Add new columns to polls table
ALTER TABLE polls ADD COLUMN IF NOT EXISTS correct_option_id UUID;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended'));
ALTER TABLE polls ADD COLUMN IF NOT EXISTS queue_position INTEGER;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS auto_start BOOLEAN DEFAULT false;

-- Add foreign key constraint for correct answer
ALTER TABLE polls ADD CONSTRAINT fk_polls_correct_option 
  FOREIGN KEY (correct_option_id) REFERENCES poll_options(id) ON DELETE SET NULL;

-- Create index for queue management
CREATE INDEX IF NOT EXISTS idx_polls_queue ON polls(event_id, queue_position, status);
CREATE INDEX IF NOT EXISTS idx_polls_timing ON polls(event_id, status, starts_at, ends_at);

-- Add function to automatically transition polls
CREATE OR REPLACE FUNCTION auto_transition_polls()
RETURNS void AS $$
BEGIN
  -- End polls that have exceeded their duration
  UPDATE polls 
  SET status = 'ended', active = false
  WHERE status = 'active' 
    AND ends_at IS NOT NULL 
    AND NOW() > ends_at;
  
  -- Start queued polls that are ready
  UPDATE polls 
  SET status = 'active', active = true, starts_at = NOW()
  WHERE status = 'draft' 
    AND auto_start = true
    AND queue_position = (
      SELECT MIN(queue_position) 
      FROM polls p2 
      WHERE p2.event_id = polls.event_id 
        AND p2.status = 'draft'
        AND p2.auto_start = true
    )
    AND NOT EXISTS (
      SELECT 1 FROM polls p3 
      WHERE p3.event_id = polls.event_id 
        AND p3.status = 'active'
    );
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call auto_transition_polls periodically
-- Note: This would typically be handled by a cron job or scheduled function
-- For now, we'll handle transitions in the application code

COMMENT ON COLUMN polls.correct_option_id IS 'ID of the correct answer option';
COMMENT ON COLUMN polls.duration_seconds IS 'How long the poll should run in seconds';
COMMENT ON COLUMN polls.starts_at IS 'When the poll actually started';
COMMENT ON COLUMN polls.ends_at IS 'When the poll should/did end';
COMMENT ON COLUMN polls.status IS 'Current status: draft, active, or ended';
COMMENT ON COLUMN polls.queue_position IS 'Position in the queue for auto-starting';
COMMENT ON COLUMN polls.auto_start IS 'Whether this poll should auto-start when queued';
