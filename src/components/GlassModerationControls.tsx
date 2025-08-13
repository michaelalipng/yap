'use client'

import { useTheme } from '@/lib/useTheme'

interface ModerationAction {
  id: string
  action: 'approve' | 'deny' | 'star' | 'unstar' | 'pin' | 'unpin'
  icon: string
  label: string
  color: string
  isActive?: boolean
  isDisabled?: boolean
}

interface GlassModerationControlsProps {
  messageId: string
  isApproved: boolean
  isStarred: boolean
  isPinned: boolean
  onModeration: (id: string, action: 'approve' | 'deny' | 'star' | 'unstar' | 'pin' | 'unpin') => void
}

export default function GlassModerationControls({
  messageId,
  isApproved,
  isStarred,
  isPinned,
  onModeration
}: GlassModerationControlsProps) {
  const { getColor } = useTheme()

  const gradientMapping = {
    blue: 'linear-gradient(hsl(var(--primary)), hsl(var(--primary)))',
    purple: 'linear-gradient(hsl(var(--accent)), hsl(var(--accent)))',
    red: 'linear-gradient(hsl(var(--destructive)), hsl(var(--destructive)))',
    indigo: 'linear-gradient(hsl(var(--primary)), hsl(var(--primary)))',
    orange: 'linear-gradient(hsl(var(--secondary)), hsl(var(--secondary)))',
    green: 'linear-gradient(hsl(var(--secondary)), hsl(var(--secondary)))',
    gray: 'linear-gradient(hsl(var(--muted)), hsl(var(--muted)))',
  }

  const getBackgroundStyle = (color: string) => {
    if (gradientMapping[color as keyof typeof gradientMapping]) {
      return { background: gradientMapping[color as keyof typeof gradientMapping] }
    }
    return { background: color }
  }

  const getModerationActions = (): ModerationAction[] => {
    const actions: ModerationAction[] = []

    // Approve/Deny actions
    if (!isApproved) {
      actions.push({
        id: 'approve',
        action: 'approve',
        icon: '✅',
        label: 'Approve',
        color: 'green'
      })
    } else {
      actions.push({
        id: 'deny',
        action: 'deny',
        icon: '🗑️',
        label: 'Remove',
        color: 'red'
      })
    }

    // Pin/Unpin actions
    if (isPinned) {
      actions.push({
        id: 'unpin',
        action: 'unpin',
        icon: '📌',
        label: 'Unpin',
        color: 'gray',
        isActive: true
      })
    } else {
      actions.push({
        id: 'pin',
        action: 'pin',
        icon: '📌',
        label: 'Pin',
        color: 'purple'
      })
    }

    // Star/Unstar actions
    if (isStarred) {
      actions.push({
        id: 'unstar',
        action: 'unstar',
        icon: '⭐',
        label: 'Unstar',
        color: 'gray',
        isActive: true
      })
    } else {
      actions.push({
        id: 'star',
        action: 'star',
        icon: '⭐',
        label: 'Star',
        color: 'orange'
      })
    }

    return actions
  }

  const handleAction = (action: ModerationAction) => {
    if (!action.isDisabled) {
      onModeration(messageId, action.action)
    }
  }

  const actions = getModerationActions()

  return (
    <div 
      className="glass-moderation-controls"
      style={{
        display: 'grid',
        gridGap: getSpacing('sm'),
        gridTemplateColumns: `repeat(${actions.length}, 1fr)`,
        margin: 'auto',
        padding: `${getSpacing('sm')} 0`,
        overflow: 'visible'
      }}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          className="glass-icon-btn"
          aria-label={action.label}
          type="button"
          onClick={() => handleAction(action)}
          disabled={action.isDisabled}
          style={{
            backgroundColor: 'transparent',
            outline: 'none',
            position: 'relative',
            width: '3.5em',
            height: '3.5em',
            perspective: '24em',
            transformStyle: 'preserve-3d',
            WebkitTapHighlightColor: 'transparent',
            border: 'none',
            cursor: action.isDisabled ? 'not-allowed' : 'pointer',
            opacity: action.isDisabled ? 0.5 : 1
          }}
        >
          <span
            className="glass-icon-btn__back"
            style={{
              ...getBackgroundStyle(action.color),
              borderRadius: '0px', // Neo Brutalism: square buttons
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              boxShadow: 'var(--shadow-md)',
              display: 'block',
              transform: 'rotate(15deg)',
              transformOrigin: '100% 100%',
              transition: 'opacity 0.3s cubic-bezier(0.83, 0, 0.17, 1), transform 0.3s cubic-bezier(0.83, 0, 0.17, 1)',
              border: '2px solid hsl(var(--border))'
            }}
          />
          <span 
            className="glass-icon-btn__front"
            style={{
              backgroundColor: 'hsl(var(--card))',
              boxShadow: '0 0 0 2px hsl(var(--border)) inset',
              backdropFilter: 'blur(0.75em)',
              WebkitBackdropFilter: 'blur(0.75em)',
              borderRadius: '0px', // Neo Brutalism: square buttons
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              transformOrigin: '80% 50%',
              transition: 'opacity 0.3s cubic-bezier(0.83, 0, 0.17, 1), transform 0.3s cubic-bezier(0.83, 0, 0.17, 1)',
              border: '2px solid hsl(var(--border))'
            }}
          >
            <span 
              className="glass-icon-btn__icon"
              aria-hidden="true"
              style={{
                margin: 'auto',
                width: '1.5em',
                height: '1.5em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2em'
              }}
            >
              {action.icon}
            </span>
          </span>
          <span 
            className="glass-icon-btn__label"
            style={{
              fontSize: '0.75em',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              lineHeight: 2,
              opacity: 0,
              position: 'absolute',
              top: '100%',
              right: 0,
              left: 0,
              transform: 'translateY(0)',
              color: 'hsl(var(--foreground))',
              fontWeight: 500,
              transition: 'opacity 0.3s cubic-bezier(0.83, 0, 0.17, 1), transform 0.3s cubic-bezier(0.83, 0, 0.17, 1)'
            }}
          >
            {action.label}
          </span>
        </button>
      ))}

      <style jsx>{`
        .glass-icon-btn:focus-visible .glass-icon-btn__back,
        .glass-icon-btn:hover .glass-icon-btn__back {
          transform: rotate(25deg) translate3d(-0.5em, -0.5em, 0.5em);
        }

        .glass-icon-btn:focus-visible .glass-icon-btn__front,
        .glass-icon-btn:hover .glass-icon-btn__front {
          transform: translateZ(2em);
        }

        .glass-icon-btn:focus-visible .glass-icon-btn__label,
        .glass-icon-btn:hover .glass-icon-btn__label {
          opacity: 1;
          transform: translateY(20%);
        }

        .glass-icon-btn:disabled:hover .glass-icon-btn__back,
        .glass-icon-btn:disabled:hover .glass-icon-btn__front,
        .glass-icon-btn:disabled:hover .glass-icon-btn__label {
          transform: none;
          opacity: 0.5;
        }
      `}</style>
    </div>
  )
} 