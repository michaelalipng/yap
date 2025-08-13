# Polls System Implementation

This document describes the new polls system implementation using the updated Supabase schema.

## Overview

The polls system has been completely re-implemented to use the new Supabase database schema with real-time functionality. The system now supports:

- Real-time poll creation and activation by moderators
- Live voting with immediate results
- Automatic notifications when new polls become active
- One vote per user per poll (enforced at database level)
- Yes/No and multiple choice poll types

## Database Schema

### Tables

1. **polls** - Main poll information
   - `id` (uuid, primary key)
   - `question` (text)
   - `type` (text: 'yesno' or 'multiple')
   - `active` (boolean)
   - `event_id` (uuid, foreign key to events)
   - `campus_id` (text)
   - `created_at` (timestamp)

2. **poll_options** - Poll answer choices
   - `id` (uuid, primary key)
   - `poll_id` (uuid, foreign key to polls)
   - `text` (text)
   - `position` (integer, for ordering)
   - `created_at` (timestamp)

3. **poll_votes** - User votes
   - `id` (uuid, primary key)
   - `poll_id` (uuid, foreign key to polls)
   - `option_id` (uuid, foreign key to poll_options)
   - `user_id` (uuid, foreign key to profiles)
   - `event_id` (uuid, auto-filled by trigger)
   - `campus_id` (text, auto-filled by trigger)
   - `created_at` (timestamp)

### RPC Functions

- `cast_vote(p_poll_id uuid, p_option_id uuid)` - Records a user's vote

### Database Triggers

- Automatically fills `event_id` and `campus_id` in poll_votes based on the poll
- Ensures only one active poll per (event_id, campus_id) combination

## Components

### 1. PollTrigger (`src/components/PollTrigger.tsx`)
- Shows the "Vote" button when an active poll exists
- Handles real-time notifications for new active polls
- Subscribes to poll changes via Supabase real-time

### 2. PollModal (`src/components/PollModal.tsx`)
- Displays the poll question and voting options
- Shows live results after voting
- Automatically detects if user has already voted
- Subscribes to vote changes for live updates

### 3. PollCreator (`src/components/PollCreator.tsx`)
- Admin interface for creating new polls
- Supports Yes/No and multiple choice poll types
- Automatically deactivates existing polls when creating new ones

### 4. Poll API (`src/lib/polls/api.ts`)
- Core API functions for poll operations
- Real-time subscriptions for live updates
- Admin functions for poll management

## Usage Flow

### For Users

1. **Poll Notification**: When a moderator activates a poll, users see a toast notification
2. **Vote Button**: A green "Vote" button appears above the chat
3. **Voting**: Clicking the button opens a modal with the poll question and options
4. **Results**: After voting, the modal switches to show live results
5. **Reopening**: If a user has already voted, reopening the modal shows results immediately

### For Moderators

1. **Create Poll**: Click the poll creation button in the admin toolbar
2. **Configure**: Set question, type (Yes/No or Multiple Choice), and options
3. **Activate**: The poll automatically becomes active and replaces any existing active poll
4. **Monitor**: View live results as users vote
5. **Deactivate**: End the poll when desired

## Real-time Features

### Poll Subscriptions
- **Channel**: `polls:{eventId}:{campusId}`
- **Events**: INSERT, UPDATE, DELETE on polls table
- **Filter**: `event_id=eq.{eventId} AND campus_id=eq.{campusId}`

### Vote Subscriptions
- **Channel**: `poll_votes:{pollId}`
- **Events**: Any change to poll_votes table
- **Filter**: `poll_id=eq.{pollId}`

## Error Handling

- **Duplicate Votes**: Handled gracefully by showing results if user has already voted
- **Network Issues**: Simple toast notifications for errors
- **Database Errors**: Logged to console with user-friendly messages

## Security Features

- **Vote Validation**: Database-level unique constraint prevents multiple votes per user per poll
- **Admin Only**: Poll creation limited to users with moderator privileges
- **Event Scoping**: Polls are scoped to specific events and campuses

## Performance Considerations

- **Lazy Loading**: Poll API functions are imported dynamically
- **Efficient Queries**: Uses database aggregates for vote counting
- **Cleanup**: Real-time subscriptions are properly cleaned up on component unmount
- **Debouncing**: Results updates are batched to prevent excessive re-renders

## Future Enhancements

- Poll templates for common question types
- Advanced analytics and reporting
- Poll scheduling and automatic activation
- Export functionality for poll results
- Integration with other chat features

## Testing

To test the poll system:

1. Start the development server: `npm run dev`
2. Log in as a moderator
3. Create a poll using the poll creation button
4. Verify the vote button appears for users
5. Test voting and real-time results
6. Verify only one vote per user is allowed
7. Test poll deactivation

## Troubleshooting

### Common Issues

1. **Poll button not appearing**: Check if there's an active event and user has campus_id
2. **Votes not updating**: Verify real-time subscriptions are working
3. **Permission errors**: Ensure user has moderator role for poll creation
4. **Database errors**: Check Supabase connection and RPC function availability

### Debug Information

- Check browser console for detailed error messages
- Verify Supabase real-time channels are connected
- Check database logs for RPC function errors
- Monitor network requests for API calls
