-- Flags table setup for YouthHub
-- This table stores feature flags and settings

-- Create flags table if it doesn't exist
CREATE TABLE IF NOT EXISTS flags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default flags
INSERT INTO flags (key, value, description) VALUES
    ('reactions_enabled', false, 'Enable/disable emoji reactions for all users'),
    ('chat_frozen', false, 'Freeze/unfreeze chat functionality')
ON CONFLICT (key) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE flags ENABLE ROW LEVEL SECURITY;

-- Create policies for flags table
CREATE POLICY "Anyone can view flags" ON flags
    FOR SELECT USING (true);

CREATE POLICY "Only moderators and speakers can update flags" ON flags
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('mod', 'speaker')
        )
    );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_flags_key ON flags(key);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_flags_updated_at 
    BEFORE UPDATE ON flags 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
