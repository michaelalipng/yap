-- Fix RLS policies to allow anonymous voting
-- This updates the poll_votes table policy to allow anonymous users to vote

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can create their own votes" ON poll_votes;

-- Create a new policy that allows anonymous voting
-- We'll allow inserts as long as the poll is active and the user hasn't already voted
CREATE POLICY "Allow anonymous voting" ON poll_votes
    FOR INSERT WITH CHECK (
        -- Check that the poll exists and is active
        EXISTS (
            SELECT 1 FROM polls 
            WHERE id = poll_id 
            AND active = true
        )
    );

-- Also update the user_id column to allow null values for anonymous users
ALTER TABLE poll_votes ALTER COLUMN user_id DROP NOT NULL;

-- Update the unique constraint to handle anonymous users
-- We'll use the combination of poll_id and user_id (which includes sessionId for anonymous users)
DROP INDEX IF EXISTS poll_votes_poll_id_user_id_key;
CREATE UNIQUE INDEX poll_votes_unique_vote ON poll_votes(poll_id, user_id);

-- Update the existing polls policy to allow updates (for poll management)
DROP POLICY IF EXISTS "Users can update polls they created" ON polls;
CREATE POLICY "Allow poll updates" ON polls
    FOR UPDATE USING (true);

-- Create policy to allow poll creation without authentication
DROP POLICY IF EXISTS "Users can create polls" ON polls;
CREATE POLICY "Allow poll creation" ON polls
    FOR INSERT WITH CHECK (true);

-- Update poll_options policies
DROP POLICY IF EXISTS "Users can create poll options" ON poll_options;
CREATE POLICY "Allow poll option creation" ON poll_options
    FOR INSERT WITH CHECK (true);

COMMENT ON POLICY "Allow anonymous voting" ON poll_votes IS 'Allows anonymous users to vote on active polls using session IDs';
