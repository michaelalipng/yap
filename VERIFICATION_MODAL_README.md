# Verification Modal System

This system provides a popup modal that appears when unverified users try to access features that require profile completion.

## Components

### 1. `VerificationRequiredModal` Component
A simple, focused modal that informs users they need to complete their profile.

**Features:**
- Clean, dark theme design matching the app
- Shows which feature requires verification
- Direct link to profile completion page
- Lists benefits of completing profile
- Option to dismiss and try later

### 2. `useVerificationModal` Hook
A custom hook that manages the verification modal state and provides utility functions.

**Usage:**
```tsx
import { useVerificationModal } from '@/lib/useVerificationModal'

function MyComponent() {
  const { 
    isVerificationModalOpen, 
    featureName, 
    hideVerificationModal, 
    showVerificationModal,
    requireVerification,
    isVerified 
  } = useVerificationModal()

  // Show modal for a specific feature
  const handleFeatureAccess = () => {
    showVerificationModal('chat access')
  }

  // Require verification before executing a function
  const handleProtectedFeature = () => {
    requireVerification('poll voting', () => {
      // This only runs if user is verified
      console.log('User can vote on polls')
    })
  }

  return (
    <div>
      {/* Your component content */}
      
      {/* Include the modal */}
      <VerificationRequiredModal
        isOpen={isVerificationModalOpen}
        onClose={hideVerificationModal}
        featureName={featureName}
      />
    </div>
  )
}
```

## Implementation Examples

### Basic Feature Protection
```tsx
const handleChatAccess = () => {
  if (!requireVerification('chat access')) {
    return // Modal will show automatically
  }
  
  // User is verified, proceed with chat access
  navigateToChat()
}
```

### Button with Verification Check
```tsx
<button
  onClick={() => requireVerification('emoji reactions', () => {
    // Add emoji reaction
    addEmojiReaction(emoji)
  })}
  className="emoji-button"
>
  😀
</button>
```

### Conditional Rendering
```tsx
const { isVerified } = useVerificationModal()

return (
  <div>
    {isVerified ? (
      <ProtectedFeature />
    ) : (
      <button onClick={() => showVerificationModal('this feature')}>
        Unlock Feature
      </button>
    )}
  </div>
)
```

## Integration Points

The verification modal can be integrated into:

1. **Chat functionality** - Before allowing message sending
2. **Poll voting** - Before allowing poll participation
3. **Emoji reactions** - Before allowing emoji usage
4. **Profile features** - Before allowing profile customization
5. **Community features** - Before allowing community participation

## Styling

The modal uses the app's dark theme with:
- Dark background (`bg-gray-900`)
- Yellow accent button (`bg-yellow-500`)
- Consistent typography using `gothamUltra` font
- Proper z-index (`z-50`) to appear above other content

## Benefits

- **User-friendly**: Clear explanation of what's needed
- **Non-blocking**: Users can dismiss and try later
- **Consistent**: Same experience across all protected features
- **Actionable**: Direct link to profile completion
- **Motivating**: Shows benefits of completing profile
