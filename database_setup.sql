-- Database setup script for YouthHub polls system
-- Run this in your Supabase SQL editor or database

-- Create polls table if it doesn't exist
CREATE TABLE IF NOT EXISTS polls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT false,
    event_id UUID REFERENCES events(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create poll_options table if it doesn't exist
CREATE TABLE IF NOT EXISTS poll_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    emoji TEXT,
    position INTEGER DEFAULT 0,
    unique TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create poll_votes table if it doesn't exist
CREATE TABLE IF NOT EXISTS poll_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
    option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    event_id UUID REFERENCES events(id),
    unique TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(poll_id, user_id) -- Prevent multiple votes per user per poll
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_polls_event_id ON polls(event_id);
CREATE INDEX IF NOT EXISTS idx_polls_active ON polls(active);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON poll_votes(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Create policies for polls table
CREATE POLICY "Users can view polls" ON polls
    FOR SELECT USING (true);

CREATE POLICY "Users can create polls" ON polls
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update polls they created" ON polls
    FOR UPDATE USING (created_by = auth.uid());

-- Create policies for poll_options table
CREATE POLICY "Users can view poll options" ON poll_options
    FOR SELECT USING (true);

CREATE POLICY "Users can create poll options" ON poll_options
    FOR INSERT WITH CHECK (true);

-- Create policies for poll_votes table
CREATE POLICY "Users can view poll votes" ON poll_votes
    FOR SELECT USING (true);

CREATE POLICY "Users can create their own votes" ON poll_votes
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create the RPC function for creating polls with options
CREATE OR REPLACE FUNCTION create_multi_poll(
    p_question TEXT,
    p_options TEXT[],
    p_event_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_poll_id UUID;
    v_option TEXT;
    v_position INTEGER := 0;
BEGIN
    -- Create the poll
    INSERT INTO polls (question, type, active, event_id)
    VALUES (
        p_question,
        CASE 
            WHEN array_length(p_options, 1) = 2 AND p_options[1] = 'Yes' AND p_options[2] = 'No' 
            THEN 'yes_no' 
            ELSE 'multi' 
        END,
        true,
        p_event_id
    )
    RETURNING id INTO v_poll_id;
    
    -- Create poll options
    FOREACH v_option IN ARRAY p_options
    LOOP
        INSERT INTO poll_options (poll_id, label, position, unique)
        VALUES (v_poll_id, v_option, v_position, lower(replace(v_option, ' ', '_')));
        v_position := v_position + 1;
    END LOOP;
    
    RETURN v_poll_id;
END;
$$;
