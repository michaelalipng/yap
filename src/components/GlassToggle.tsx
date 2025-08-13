'use client'

import { useTheme } from '@/lib/useTheme'

interface GlassToggleProps {
  isActive: boolean
  onToggle: () => void
  icon: string
  label: string
  activeColor?: string
  inactiveColor?: string
  disabled?: boolean
}

export default function GlassToggle({
  isActive,
  onToggle,
  icon,
  label,
  activeColor = 'green',
  inactiveColor = 'gray',
  disabled = false
}: GlassToggleProps) {
  const { getColor } = useTheme()

  const gradientMapping = {
    green: 'linear-gradient(hsl(var(--secondary)), hsl(var(--secondary)))',
    red: 'linear-gradient(hsl(var(--destructive)), hsl(var(--destructive)))',
    blue: 'linear-gradient(hsl(var(--primary)), hsl(var(--primary)))',
    purple: 'linear-gradient(hsl(var(--accent)), hsl(var(--accent)))',
    orange: 'linear-gradient(hsl(var(--secondary)), hsl(var(--secondary)))',
    gray: 'linear-gradient(hsl(var(--muted)), hsl(var(--muted)))',
  }

  const getBackgroundStyle = (color: string) => {
    if (gradientMapping[color as keyof typeof gradientMapping]) {
      return { background: gradientMapping[color as keyof typeof gradientMapping] }
    }
    return { background: color }
  }

  const currentColor = isActive ? activeColor : inactiveColor

  return (
    <button
      className="glass-toggle-btn"
      onClick={onToggle}
      disabled={disabled}
      aria-label={label}
      style={{
        backgroundColor: 'transparent',
        outline: 'none',
        position: 'relative',
        width: '4em',
        height: '4em',
        perspective: '24em',
        transformStyle: 'preserve-3d',
        WebkitTapHighlightColor: 'transparent',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1
      }}
    >
      <span
        className="glass-toggle-btn__back"
        style={{
          ...getBackgroundStyle(currentColor),
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
        className="glass-toggle-btn__front"
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
          className="glass-toggle-btn__icon"
          aria-hidden="true"
          style={{
            margin: 'auto',
            width: '1.5em',
            height: '1.5em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5em'
          }}
        >
          {icon}
        </span>
      </span>
      <span 
        className="glass-toggle-btn__label"
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
        {isActive ? `${label} On` : `${label} Off`}
      </span>
    </button>
  )
}

// Container component for multiple toggles
interface GlassToggleGroupProps {
  children: React.ReactNode
}

export function GlassToggleGroup({ children }: GlassToggleGroupProps) {
  const { getSpacing } = useTheme()

  return (
    <div 
      className="glass-toggle-group"
      style={{
        display: 'flex',
        gap: getSpacing('lg'),
        justifyContent: 'center',
        alignItems: 'center',
        padding: `${getSpacing('lg')} 0`
      }}
    >
      {children}
    </div>
  )
}

// Pre-configured toggle components
export function ReactionsToggle({ isActive, onToggle, disabled }: { isActive: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <GlassToggle
      isActive={isActive}
      onToggle={onToggle}
      icon="😊"
      label="Reactions"
      activeColor="green"
      inactiveColor="gray"
      disabled={disabled}
    />
  )
}

export function ChatFreezeToggle({ isActive, onToggle, disabled }: { isActive: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <GlassToggle
      isActive={isActive}
      onToggle={onToggle}
      icon={isActive ? "❄️" : "💬"}
      label="Chat"
      activeColor="red"
      inactiveColor="blue"
      disabled={disabled}
    />
  )
} 