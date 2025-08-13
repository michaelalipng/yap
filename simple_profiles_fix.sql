-- Simple fix for existing profiles table
-- Run this in your Supabase SQL editor to add missing columns

-- Add missing columns if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- Update existing profiles to have default values
UPDATE profiles SET 
  last_name = COALESCE(last_name, ''),
  school = COALESCE(school, ''),
  phone = COALESCE(phone, ''),
  verified = COALESCE(verified, false)
WHERE last_name IS NULL OR school IS NULL OR phone IS NULL OR verified IS NULL;

-- Grant permissions to authenticated users
GRANT ALL ON profiles TO authenticated;

-- Enable RLS if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create basic policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view all profiles') THEN
    CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
    CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile') THEN
    CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;
