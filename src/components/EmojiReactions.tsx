'use client'

import { useState } from 'react'
import { useTheme } from '@/lib/useTheme'
import { useVerificationModal } from '@/lib/useVerificationModal'

interface EmojiReactionsProps {
  enabled: boolean
  onEmojiClick: (emoji: string) => void
  floatingEmojis: { emoji: string; id: string; startX: number }[]
  isVerified?: boolean
}

const EMOJI_OPTIONS = [
  { emoji: '🔥', label: 'Fire', color: '#ff6b35' },
  { emoji: '❤️', label: 'Heart', color: '#ff6b9d' },
  { emoji: '👏', label: 'Clap', color: '#4ecdc4' },
  { emoji: '🙌', label: 'Raise Hands', color: '#45b7d1' },
  { emoji: '😮', label: 'Wow', color: '#96ceb4' },
  { emoji: '🎉', label: 'Party', color: '#feca57' },
  { emoji: '💯', label: '100', color: '#ff9ff3' },
  { emoji: '🚀', label: 'Rocket', color: '#54a0ff' }
]

export default function EmojiReactions({ 
  enabled, 
  onEmojiClick, 
  floatingEmojis,
  isVerified = true
}: EmojiReactionsProps) {
  const { getComponentStyle, getColor, getBorderRadius } = useTheme()
  const { showVerificationModal } = useVerificationModal()
  const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null)

  if (!enabled) return null

  const containerStyle = getComponentStyle('reactions', 'container')
  const emojiStyle = getComponentStyle('reactions', 'emoji')
  const floatingStyle = getComponentStyle('reactions', 'floating')

  const handleEmojiClick = (emoji: string) => {
    if (!isVerified) {
      showVerificationModal('emoji reactions')
      return
    }
    onEmojiClick(emoji)
  }

  return (
    <>
      {/* Emoji Reactions Bar */}
      <div 
        className="emoji-reactions-container"
        style={containerStyle}
      >
        <div className="flex items-center gap-2 mb-2">
          <span 
            className="reactions-label text-sm font-medium"
            style={{ color: getColor('neutral.600') }}
          >
            Quick Reactions:
          </span>
        </div>
        
        <div className="flex justify-center gap-3">
          {EMOJI_OPTIONS.map(({ emoji, label, color }) => {
            const isHovered = hoveredEmoji === emoji
            
            return (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                onMouseEnter={() => setHoveredEmoji(emoji)}
                onMouseLeave={() => setHoveredEmoji(null)}
                className="emoji-button group"
                style={{
                  ...emojiStyle,
                  ...(isHovered && getComponentStyle('reactions', 'emojiHover')),
                  position: 'relative',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                title={label}
              >
                <span className="emoji-text">{emoji}</span>
                
                {/* Hover effect background */}
                <div 
                  className="emoji-hover-bg absolute inset-0 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                  style={{
                    background: color,
                    borderRadius: getBorderRadius('full')
                  }}
                />
                
                {/* Ripple effect */}
                {isHovered && (
                  <div 
                    className="emoji-ripple absolute inset-0 rounded-full animate-ping"
                    style={{
                      background: color,
                      opacity: 0.3,
                      animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite'
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>
        
        <div 
          className="reactions-hint text-xs text-center mt-2"
          style={{ color: getColor('neutral.500') }}
        >
          Click an emoji to react! 🎉
        </div>
      </div>

      {/* Floating Emojis */}
      <div className="floating-emojis-container absolute inset-0 pointer-events-none z-50">
        {floatingEmojis.map((emojiObj) => (
          <div
            key={emojiObj.id}
            className="floating-emoji"
            style={{
              ...floatingStyle,
              left: `${emojiObj.startX}%`,
              bottom: '120px',
              animation: 'float 3s ease-out forwards'
            }}
          >
            {emojiObj.emoji}
          </div>
        ))}
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(0px) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(-20px) scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: translateY(-40px) scale(0.8);
            opacity: 0;
          }
        }
        
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        
        .emoji-button:hover {
          transform: scale(1.2) rotate(5deg);
        }
        
        .floating-emoji {
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
        }
      `}</style>
    </>
  )
} 