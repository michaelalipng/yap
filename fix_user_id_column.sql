-- Fix user_id column to support string session IDs instead of UUIDs
-- This allows anonymous voting with session strings

-- First, drop the foreign key constraint that requires UUID
ALTER TABLE poll_votes DROP CONSTRAINT IF EXISTS poll_votes_user_id_fkey;

-- Change the user_id column type from UUID to TEXT to support session strings
ALTER TABLE poll_votes ALTER COLUMN user_id TYPE TEXT;

-- Update the unique constraint to work with the new TEXT type
DROP INDEX IF EXISTS poll_votes_unique_vote;
CREATE UNIQUE INDEX poll_votes_unique_vote ON poll_votes(poll_id, user_id);

-- Also update the original unique constraint if it exists
ALTER TABLE poll_votes DROP CONSTRAINT IF EXISTS poll_votes_poll_id_user_id_key;
ALTER TABLE poll_votes ADD CONSTRAINT poll_votes_poll_id_user_id_key UNIQUE (poll_id, user_id);

COMMENT ON COLUMN poll_votes.user_id IS 'User ID (UUID for authenticated users, session string for anonymous users)';
