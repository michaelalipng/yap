-- Events table setup script for YouthHub emoji monitor
-- Run this in your Supabase SQL editor if the events table doesn't exist

-- Create events table if it doesn't exist
CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    active BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for active events
CREATE INDEX IF NOT EXISTS idx_events_active ON events(active);

-- Enable Row Level Security (RLS)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policies for events table
CREATE POLICY "Users can view events" ON events
    FOR SELECT USING (true);

CREATE POLICY "Moderators can create events" ON events
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('mod', 'admin')
        )
    );

CREATE POLICY "Moderators can update events" ON events
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('mod', 'admin')
        )
    );

CREATE POLICY "Moderators can delete events" ON events
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('mod', 'admin')
        )
    );

-- Insert a sample event for testing (optional)
-- INSERT INTO events (title, description, starts_at, ends_at, active, created_by)
-- VALUES (
--     'Sample Youth Service',
--     'A sample event for testing emoji reactions',
--     NOW(),
--     NOW() + INTERVAL '2 hours',
--     true,
--     (SELECT id FROM auth.users LIMIT 1)
-- );
