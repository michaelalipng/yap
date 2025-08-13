# Emoji Overlay for OBS and ProPresenter

This page provides a transparent overlay that displays floating emoji reactions in real-time, perfect for use as a Browser Source in OBS and then NDI (with alpha) into ProPresenter.

## URL

```
/presenter/emoji?token=YOUR_TOKEN
```

## Features

- **Fully Transparent Background**: Perfect for overlaying on top of other content
- **Real-time Emoji Reactions**: Instantly displays emoji reactions from the chat
- **GPU-Optimized Animations**: Uses `translate3d` and `requestAnimationFrame` for smooth performance
- **Performance Optimized**: Limits concurrent emojis to ~40 to maintain high frame rates
- **Event-Aware**: Only shows reactions when there's an active event
- **Secure**: Requires valid authorization token

## Setup Instructions

### 1. OBS Setup

1. Add a **Browser Source** to your scene
2. Set the URL to: `http://localhost:3000/presenter/emoji?token=YOUR_TOKEN`
3. Set the width and height to match your stream resolution
4. **Important**: Check "Shutdown source when not visible" for performance
5. **Important**: Set "CSS" to ensure transparency works:
   ```css
   body { background: transparent !important; }
   ```

### 2. ProPresenter Integration

1. In OBS, enable **NDI Output** (Tools > NDI Output Settings)
2. Set a unique NDI stream name (e.g., "YouthHub Emoji Overlay")
3. In ProPresenter, add an **NDI Source**
4. Select your OBS NDI stream
5. Enable **Alpha Channel** to maintain transparency

### 3. Authorization

The page requires a token parameter. Currently, any non-empty token is accepted for testing purposes.

## Technical Details

### Animation System

- **Duration**: 2-4 seconds per emoji (randomized)
- **Movement**: Vertical upward with slight horizontal drift
- **Performance**: Uses `requestAnimationFrame` and GPU transforms
- **Cleanup**: Automatic cleanup of completed animations every 100ms

### Real-time Communication

- **Channel**: `emoji-reactions` Supabase realtime channel
- **Event Type**: `emoji` broadcast events
- **Payload**: `{ emoji: string }`

### CSS Classes

- `.emoji-overlay`: Main container with transparent background
- `.floating-emoji`: Individual emoji elements with GPU optimizations

## Customization

### Animation Timing

Modify the `animationDuration` range in the `addFloatingEmoji` function:

```typescript
const animationDuration = 2000 + Math.random() * 2000 // 2-4 seconds
```

### Emoji Size

Adjust the `fontSize` in the emoji rendering:

```typescript
fontSize: '2rem', // Increase for larger emojis
```

### Concurrent Limit

Modify the emoji limit for performance tuning:

```typescript
// Limit concurrent emojis to ~40 for performance
const filtered = prev.filter(emoji => 
  Date.now() - emoji.startTime < emoji.animationDuration
)
```

## Troubleshooting

### Emojis Not Appearing

1. Check that there's an active event in the database
2. Verify the token parameter is present
3. Check browser console for errors
4. Ensure emoji reactions are enabled in the admin panel

### Performance Issues

1. Reduce the concurrent emoji limit
2. Increase the cleanup frequency
3. Check if too many emojis are being sent simultaneously

### Transparency Issues

1. Verify CSS is set in OBS Browser Source
2. Check that the page has the `emoji-overlay` class
3. Ensure no background colors are being applied

## Browser Compatibility

- **Chrome/Edge**: Full support with GPU acceleration
- **Firefox**: Full support
- **Safari**: Full support on macOS
- **Mobile**: Limited support due to performance constraints

## Security Notes

- The current implementation accepts any token for testing
- In production, implement proper token validation
- Consider rate limiting emoji reactions to prevent spam
- Monitor for excessive emoji usage that could impact performance
