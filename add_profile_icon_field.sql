-- Add profile_icon field to profiles table
-- Run this in your Supabase SQL editor to fix the missing profile_icon field

-- Add profile_icon column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_icon TEXT DEFAULT 'Dog';

-- Update existing profiles to have a default profile icon if they don't have one
UPDATE profiles SET profile_icon = 'Dog' WHERE profile_icon IS NULL;

-- Grant permissions to authenticated users (if not already granted)
GRANT ALL ON profiles TO authenticated;

-- Create index for better performance on profile_icon queries
CREATE INDEX IF NOT EXISTS idx_profiles_profile_icon ON profiles(profile_icon);
