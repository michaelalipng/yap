-- Safe complete fix for anonymous voting - handles existing policies gracefully
-- This script uses IF EXISTS and CREATE OR REPLACE to avoid conflicts

-- Step 1: Drop ALL existing policies that might depend on user_id (safe with IF EXISTS)
DROP POLICY IF EXISTS "Users can create their own votes" ON poll_votes;
DROP POLICY IF EXISTS "Allow anonymous voting" ON poll_votes;
DROP POLICY IF EXISTS "users can vote once when active" ON poll_votes;
DROP POLICY IF EXISTS "Users can view poll votes" ON poll_votes;
DROP POLICY IF EXISTS "Allow voting on active polls" ON poll_votes;

-- Step 2: Drop constraints and indexes safely
ALTER TABLE poll_votes DROP CONSTRAINT IF EXISTS poll_votes_user_id_fkey;
ALTER TABLE poll_votes DROP CONSTRAINT IF EXISTS poll_votes_poll_id_user_id_key;
DROP INDEX IF EXISTS poll_votes_unique_vote;

-- Step 3: Change the user_id column type from UUID to TEXT
ALTER TABLE poll_votes ALTER COLUMN user_id TYPE TEXT;

-- Step 4: Make user_id nullable for anonymous users
ALTER TABLE poll_votes ALTER COLUMN user_id DROP NOT NULL;

-- Step 5: Create new unique constraint for the TEXT type
CREATE UNIQUE INDEX IF NOT EXISTS poll_votes_unique_vote ON poll_votes(poll_id, user_id);

-- Step 6: Create new RLS policies that support both authenticated and anonymous users
CREATE POLICY "Allow voting on active polls" ON poll_votes
    FOR INSERT WITH CHECK (
        -- Check that the poll exists and is active
        EXISTS (
            SELECT 1 FROM polls 
            WHERE id = poll_id 
            AND active = true
        )
    );

CREATE POLICY "Users can view poll votes" ON poll_votes
    FOR SELECT USING (true);

-- Step 7: Update other poll-related policies safely (using DROP IF EXISTS first)
DROP POLICY IF EXISTS "Users can update polls they created" ON polls;
DROP POLICY IF EXISTS "Allow poll updates" ON polls;
CREATE POLICY "Allow poll updates" ON polls
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can create polls" ON polls;
DROP POLICY IF EXISTS "Allow poll creation" ON polls;
CREATE POLICY "Allow poll creation" ON polls
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can create poll options" ON poll_options;
DROP POLICY IF EXISTS "Allow poll option creation" ON poll_options;
CREATE POLICY "Allow poll option creation" ON poll_options
    FOR INSERT WITH CHECK (true);

-- Step 8: Ensure RLS is enabled on all tables
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON COLUMN poll_votes.user_id IS 'User ID (UUID for authenticated users, session string for anonymous users)';
COMMENT ON POLICY "Allow voting on active polls" ON poll_votes IS 'Allows both authenticated and anonymous users to vote on active polls';

-- Show success message
DO $$ 
BEGIN 
    RAISE NOTICE 'Anonymous voting fix applied successfully! You can now vote with session IDs.';
END $$;
