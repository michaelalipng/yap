-- Messages table setup script for YouthHub chat system
-- Run this in your Supabase SQL editor or database

-- Create messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    anonymous BOOLEAN NOT NULL DEFAULT false,
    approved BOOLEAN NOT NULL DEFAULT false,
    denied BOOLEAN NOT NULL DEFAULT false,
    starred BOOLEAN NOT NULL DEFAULT false,
    pinned BOOLEAN NOT NULL DEFAULT false,
    sender_name TEXT,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    upvote_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create message_upvotes table for tracking user upvotes
CREATE TABLE IF NOT EXISTS message_upvotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id) -- Prevent multiple upvotes per user per message
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_event_id ON messages(event_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_approved ON messages(approved);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_starred ON messages(starred);
CREATE INDEX IF NOT EXISTS idx_messages_pinned ON messages(pinned);
CREATE INDEX IF NOT EXISTS idx_message_upvotes_message_id ON message_upvotes(message_id);
CREATE INDEX IF NOT EXISTS idx_message_upvotes_user_id ON message_upvotes(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_upvotes ENABLE ROW LEVEL SECURITY;

-- Create policies for messages table
CREATE POLICY "Users can view messages" ON messages
    FOR SELECT USING (true);

CREATE POLICY "Users can create their own messages" ON messages
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Moderators can moderate all messages" ON messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('mod', 'admin', 'speaker')
        )
    );

-- Create policies for message_upvotes table
CREATE POLICY "Users can view message upvotes" ON message_upvotes
    FOR SELECT USING (true);

CREATE POLICY "Users can create their own upvotes" ON message_upvotes
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own upvotes" ON message_upvotes
    FOR DELETE USING (user_id = auth.uid());

-- Create function to update upvote count
CREATE OR REPLACE FUNCTION update_message_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE messages 
        SET upvote_count = upvote_count + 1 
        WHERE id = NEW.message_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE messages 
        SET upvote_count = upvote_count - 1 
        WHERE id = OLD.message_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update upvote count
CREATE TRIGGER trigger_update_message_upvote_count
    AFTER INSERT OR DELETE ON message_upvotes
    FOR EACH ROW
    EXECUTE FUNCTION update_message_upvote_count();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
