-- Test script to check messages table and add test data
-- Run this in your Supabase SQL editor

-- 1. Check if messages table exists
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'messages';

-- 2. If table doesn't exist, create it first
-- Run messages_table_setup.sql first, then come back here

-- 3. Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'messages'
ORDER BY ordinal_position;

-- 4. Check if there are any events
SELECT * FROM events WHERE active = true;

-- 5. Check if there are any messages
SELECT 
  id,
  content,
  user_id,
  approved,
  denied,
  event_id,
  created_at
FROM messages 
ORDER BY created_at DESC 
LIMIT 10;

-- 6. Add some test messages (only run this if you have an active event)
-- Replace 'YOUR_EVENT_ID' with an actual event ID from step 4
/*
INSERT INTO messages (
  content,
  user_id,
  anonymous,
  approved,
  denied,
  event_id,
  sender_name
) VALUES 
  ('This is a test message 1', '00000000-0000-0000-0000-000000000001', false, true, false, 'YOUR_EVENT_ID', 'Test User 1'),
  ('This is a test message 2', '00000000-0000-0000-0000-000000000002', false, true, false, 'YOUR_EVENT_ID', 'Test User 2'),
  ('This is a test message 3', '00000000-0000-0000-0000-000000000003', false, true, false, 'YOUR_EVENT_ID', 'Test User 3'),
  ('This is a test message 4', '00000000-0000-0000-0000-000000000004', false, true, false, 'YOUR_EVENT_ID', 'Test User 4'),
  ('This is a test message 5', '00000000-0000-0000-0000-000000000005', false, true, false, 'YOUR_EVENT_ID', 'Test User 5'),
  ('This is a test message 6', '00000000-0000-0000-0000-000000000006', false, true, false, 'YOUR_EVENT_ID', 'Test User 6'),
  ('This is a test message 7', '00000000-0000-0000-0000-000000000007', false, true, false, 'YOUR_EVENT_ID', 'Test User 7'),
  ('This is a test message 8', '00000000-0000-0000-0000-000000000008', false, true, false, 'YOUR_EVENT_ID', 'Test User 8'),
  ('This is a test message 9', '00000000-0000-0000-0000-000000000009', false, true, false, 'YOUR_EVENT_ID', 'Test User 9'),
  ('This is a test message 10', '00000000-0000-0000-0000-000000000010', false, true, false, 'YOUR_EVENT_ID', 'Test User 10');
*/

-- 7. Check message count by event
SELECT 
  event_id,
  COUNT(*) as total_messages,
  COUNT(CASE WHEN approved = true AND denied = false THEN 1 END) as approved_messages
FROM messages 
GROUP BY event_id;
