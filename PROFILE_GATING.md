# Profile Completion Gating System

This document describes the profile completion gating system implemented in the YouthHub application.

## Overview

The profile completion gating system ensures that users complete their profiles before accessing certain interactive features. This helps maintain community quality while allowing users to participate in basic chat functionality. Users can see and read all content but need verification for interactive features like voting and reactions.

## Components

### 1. `useProfileCompletion` Hook (`src/lib/useProfileCompletion.ts`)

A custom React hook that manages profile completion status and provides utilities for checking completion.

**Features:**
- Fetches user profile data
- Calculates completion percentage
- Identifies missing required fields
- Provides field display names
- Refreshes profile data

**Required Fields:**
- Last Name
- Birthday
- School
- Phone Number

**Optional Fields:**
- Username

### 2. `ProfileCompletionModal` Component (`src/components/ProfileCompletionModal.tsx`)

A modal component that allows users to complete their profile information.

**Features:**
- Progress bar showing completion percentage
- Form for all required and optional fields
- Real-time validation
- Success feedback
- Feature benefits preview

### 3. `ProfileGate` Component (`src/components/ProfileGate.tsx`)

A higher-order component that gates features based on profile completion status.

**Features:**
- Shows preview of gated content with overlay
- Configurable completion percentage requirements
- Option to show/hide preview
- Direct integration with profile completion modal

### 4. `ProfileCompletionIndicator` Component (`src/components/ProfileCompletionIndicator.tsx`)

A small component for displaying profile completion status in navigation or other UI elements.

**Features:**
- Compact and full display modes
- Optional completion button
- Loading states
- Color-coded badges

## Implementation

### Main Page (`src/app/page.tsx`)

The main page now shows different content based on user authentication and profile completion:

1. **Not logged in**: Shows login/signup options
2. **Logged in, incomplete profile**: Shows welcome message with completion progress and feature previews
3. **Complete profile**: Shows full dashboard with all features

### Chat Page (`src/app/chat/page.tsx`)

The chat page includes profile completion gating for:

- **Message sending**: Available to all users (no gating)
- **Poll voting**: Requires complete profile (shows verification prompt)
- **Emoji reactions**: Requires complete profile (shows verification prompt)
- **Poll viewing**: Available to all users (can see polls but not vote)
- **Emoji reaction bar**: Visible to all users (shows prompt when clicked)

### Profile Page (`src/app/profile/page.tsx`)

Enhanced with:

- Profile completion status section
- Missing fields list
- Clear indication of what's needed to unlock features

## Usage Examples

### Basic Profile Gate

```tsx
import ProfileGate from '@/components/ProfileGate'

<ProfileGate featureName="Chat">
  <ChatComponent />
</ProfileGate>
```

### Profile Gate with Custom Requirements

```tsx
<ProfileGate 
  featureName="Premium Features"
  requiredCompletion={75}
  showPreview={false}
>
  <PremiumFeatures />
</ProfileGate>
```

### Profile Completion Indicator

```tsx
import ProfileCompletionIndicator from '@/components/ProfileCompletionIndicator'

// In navigation
<ProfileCompletionIndicator compact={true} />

// With completion button
<ProfileCompletionIndicator showButton={true} />
```

## Database Schema

The system relies on the existing `profiles` table with a `verified` boolean field that gets set to `true` when all required fields are completed.

## User Experience

1. **New users** can immediately start chatting and viewing content
2. **Incomplete profiles** can participate in basic chat but get prompted when trying interactive features
3. **Complete profiles** have full access to all features including voting and reactions
4. **Feature discovery** happens naturally when users try to interact
5. **Non-intrusive prompts** only appear when users attempt restricted actions

## Benefits

- **Community Quality**: Ensures users provide necessary information for interactive features
- **User Engagement**: Allows immediate participation while encouraging profile completion
- **Feature Discovery**: Natural discovery when users try to interact
- **Reduced Friction**: No barriers to basic chat participation
- **Flexible Implementation**: Easy to gate any feature with the ProfileGate component
- **Better UX**: Users aren't blocked from core functionality
