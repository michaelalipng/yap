-- Comprehensive fix for all poll-related RLS issues
-- This completely removes all restrictive policies and creates permissive ones

-- STEP 1: Disable RLS temporarily to clear all policies
ALTER TABLE polls DISABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop ALL existing policies on all poll tables
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    -- Drop all policies on polls table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'polls') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON polls';
    END LOOP;
    
    -- Drop all policies on poll_options table  
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'poll_options') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON poll_options';
    END LOOP;
    
    -- Drop all policies on poll_votes table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'poll_votes') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON poll_votes';
    END LOOP;
END $$;

-- STEP 3: Re-enable RLS
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY; 
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create completely permissive policies for polls table
CREATE POLICY "polls_select_all" ON polls FOR SELECT USING (true);
CREATE POLICY "polls_insert_all" ON polls FOR INSERT WITH CHECK (true);
CREATE POLICY "polls_update_all" ON polls FOR UPDATE USING (true);
CREATE POLICY "polls_delete_all" ON polls FOR DELETE USING (true);

-- STEP 5: Create completely permissive policies for poll_options table
CREATE POLICY "poll_options_select_all" ON poll_options FOR SELECT USING (true);
CREATE POLICY "poll_options_insert_all" ON poll_options FOR INSERT WITH CHECK (true);
CREATE POLICY "poll_options_update_all" ON poll_options FOR UPDATE USING (true);
CREATE POLICY "poll_options_delete_all" ON poll_options FOR DELETE USING (true);

-- STEP 6: Create completely permissive policies for poll_votes table
CREATE POLICY "poll_votes_select_all" ON poll_votes FOR SELECT USING (true);
CREATE POLICY "poll_votes_insert_all" ON poll_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "poll_votes_update_all" ON poll_votes FOR UPDATE USING (true);
CREATE POLICY "poll_votes_delete_all" ON poll_votes FOR DELETE USING (true);

-- STEP 7: Add helpful comments
COMMENT ON POLICY "polls_insert_all" ON polls IS 'Allows unrestricted poll creation for event management';
COMMENT ON POLICY "poll_votes_insert_all" ON poll_votes IS 'Allows unrestricted voting including anonymous users';

-- STEP 8: Show success message
DO $$ 
BEGIN 
    RAISE NOTICE 'All RLS policies have been reset to be completely permissive. Poll creation and voting should now work without restrictions.';
END $$;
