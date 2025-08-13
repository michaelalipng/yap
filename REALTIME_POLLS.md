# Real-Time Polls System

This document explains how the real-time polls system works in the YouthHub application, ensuring that all users see new polls and vote updates immediately without needing to refresh the page.

## Overview

The real-time polls system uses Supabase's real-time subscriptions to automatically update poll data across all connected clients. When a new poll is created, activated, or when votes are cast, all users see the changes instantly.

## Architecture

### 1. RealtimePollProvider (Context Provider)

Located at `src/components/RealtimePollProvider.tsx`, this React Context provider manages real-time subscriptions for all polls across the application.

**Key Features:**
- Manages active polls for all events
- Sets up real-time subscriptions to Supabase
- Provides real-time poll updates to all components
- Handles subscription cleanup automatically
- Prevents infinite loops with update guards

**Usage:**
```tsx
import { useRealtimePolls } from '@/components/RealtimePollProvider'

function MyComponent() {
  const { activePolls, subscribeToPoll, refreshPoll } = useRealtimePolls()
  
  // Subscribe to polls for a specific event
  useEffect(() => {
    const unsubscribe = subscribeToPoll(eventId)
    return unsubscribe
  }, [eventId, subscribeToPoll])
  
  // Get active poll for current event
  const currentPoll = activePolls[eventId]
}
```

### 2. Real-Time Subscriptions

The system subscribes to two main database tables:

#### Polls Table (`polls`)
- **INSERT**: New poll created and activated
- **UPDATE**: Poll activated/deactivated
- **DELETE**: Poll removed

#### Poll Votes Table (`poll_votes`)
- **INSERT/UPDATE/DELETE**: Vote changes trigger result updates

### 3. Components Integration

#### PollTrigger Component
- Automatically shows/hides based on active polls
- Displays notification when new polls become available
- Uses real-time context for immediate updates

#### Poll Component
- Shows poll options and results
- Handles voting with real-time result updates
- Automatically refreshes when votes change
- Has its own vote subscription to avoid infinite loops

#### PollModal Component
- Modal interface for polls
- Real-time vote subscription for live results
- Immediate UI updates when votes are cast

## How It Works

### 1. Poll Creation
1. Admin creates a new poll via `PollCreator`
2. Poll is inserted into database with `active: true`
3. Real-time subscription detects the INSERT
4. All connected clients immediately see the new poll
5. `PollTrigger` shows notification and vote button

### 2. Real-Time Voting
1. User casts a vote via `Poll` or `PollModal`
2. Vote is inserted into database
3. Real-time subscription detects the INSERT
4. All clients automatically refresh poll results
5. Progress bars and percentages update in real-time

### 3. Poll Management
1. Admin can end polls (set `active: false`)
2. Real-time subscription detects the UPDATE
3. All clients immediately see poll is inactive
4. Voting is disabled across all clients

## Database Schema

### Required Tables

```sql
-- Polls table
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('yes_no', 'multi')),
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  event_id UUID REFERENCES events(id),
  created_by UUID REFERENCES profiles(id)
);

-- Poll options table
CREATE TABLE poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unique TEXT UNIQUE
);

-- Poll votes table
CREATE TABLE poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id),
  unique TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Required Supabase Policies

```sql
-- Enable real-time for polls table
ALTER TABLE polls REPLICA IDENTITY FULL;

-- Enable real-time for poll_votes table
ALTER TABLE poll_votes REPLICA IDENTITY FULL;

-- Row Level Security policies (if using RLS)
-- These should allow authenticated users to read polls and vote
```

## Setup Requirements

### 1. Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Supabase Configuration
- Real-time must be enabled in your Supabase project
- Database tables must exist with correct schema
- Appropriate RLS policies must be configured

### 3. Component Integration
The `RealtimePollProvider` is already integrated into the root layout (`src/app/layout.tsx`), so all components automatically have access to real-time poll data.

## Usage Examples

### Basic Poll Display
```tsx
import { useRealtimePolls } from '@/components/RealtimePollProvider'

function EventPage({ eventId }) {
  const { activePolls } = useRealtimePolls()
  const activePoll = activePolls[eventId]
  
  if (!activePoll) {
    return <div>No active polls</div>
  }
  
  return <Poll poll={activePoll} userId={currentUserId} />
}
```

### Manual Poll Subscription
```tsx
import { useRealtimePolls } from '@/components/RealtimePollProvider'

function CustomPollComponent({ eventId }) {
  const { subscribeToPoll, activePolls } = useRealtimePolls()
  
  useEffect(() => {
    const unsubscribe = subscribeToPoll(eventId)
    return unsubscribe
  }, [eventId, subscribeToPoll])
  
  const poll = activePolls[eventId]
  // ... rest of component
}
```

## Benefits

1. **No Page Refresh Required**: Users see new polls and vote updates instantly
2. **Real-Time Engagement**: Live poll results create interactive experiences
3. **Automatic Updates**: All clients stay synchronized automatically
4. **Efficient**: Only relevant data is transmitted via WebSocket
5. **Scalable**: Works with any number of connected clients

## Troubleshooting

### Common Issues

1. **Polls not updating in real-time**
   - Check Supabase real-time is enabled
   - Verify database tables exist
   - Check browser console for subscription errors

2. **Multiple poll subscriptions**
   - Ensure `subscribeToPoll` is called only once per event
   - Check for proper cleanup in useEffect

3. **Performance issues**
   - Monitor WebSocket connections in browser dev tools
   - Ensure subscriptions are cleaned up on component unmount

4. **Infinite Loop Error (Maximum update depth exceeded)**
   - **Cause**: This happens when subscription callbacks trigger state updates that cause the subscription to re-run
   - **Solution**: The system now uses update guards and separate vote subscriptions to prevent this
   - **Prevention**: Each component manages its own vote subscriptions independently

### Debug Mode

Enable debug logging by checking the browser console:
- Real-time subscription status
- Poll change events
- Vote updates
- Subscription cleanup

### Testing Real-Time Functionality

Use the test page at `/test-realtime-polls` to verify:
1. Open multiple browser tabs
2. Create a poll in one tab
3. Watch it appear instantly in all other tabs
4. End the poll and see it disappear everywhere

## Future Enhancements

1. **Poll Analytics**: Real-time charts and statistics
2. **Multi-Poll Support**: Multiple active polls per event
3. **Advanced Notifications**: Push notifications for new polls
4. **Poll Templates**: Pre-defined poll types and options
5. **Export Results**: Download poll results in various formats

## Conclusion

The real-time polls system provides an engaging, interactive experience for users while maintaining excellent performance and reliability. By leveraging Supabase's real-time capabilities, the system ensures all users stay synchronized without manual page refreshes.

The system has been designed to prevent common issues like infinite loops while maintaining the real-time functionality that makes polls engaging and interactive.
