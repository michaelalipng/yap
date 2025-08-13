'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { onEmoji } from '@/lib/realtime/emoji'

interface EmojiReaction {
  id: string
  emoji: string
  startX: number
  startY: number
  startTime: number
  animationDuration: number
  count?: number // For batching multiple of the same emoji
}

interface ActiveEvent {
  id: string
  title: string
}

export default function EmojiOverlayPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null)
  const [floatingEmojis, setFloatingEmojis] = useState<EmojiReaction[]>([])
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const emojisRef = useRef<EmojiReaction[]>([])
  const emojiQueueRef = useRef<{ emoji: string; timestamp: number }[]>([])
  const lastProcessTimeRef = useRef<number>(0)
  const processingRef = useRef<boolean>(false)

  // Keep ref in sync with state
  useEffect(() => {
    emojisRef.current = floatingEmojis
  }, [floatingEmojis])

  // Memoized event fetching function
  const fetchActiveEvent = useCallback(async () => {
    try {
      const { data: eventData, error } = await supabase
        .from('events')
        .select('id, title')
        .eq('active', true)
        .maybeSingle()

      if (error) {
        console.error('Error fetching active event:', error)
        setLoading(false)
        return
      }

      if (eventData) {
        setActiveEvent(eventData)
      }
        setLoading(false)
    } catch (error) {
      console.error('Error fetching active event:', error)
      setLoading(false)
    }
  }, [])

  // Fetch active event
  useEffect(() => {
    fetchActiveEvent()
  }, [fetchActiveEvent])

  // Process emoji queue efficiently
  const processEmojiQueue = useCallback(() => {
    if (processingRef.current || !containerRef.current) return
    
    processingRef.current = true
    const now = Date.now()
    
    // Process queue in batches every 100ms
    if (now - lastProcessTimeRef.current < 100) {
      processingRef.current = false
      return
    }
    
    lastProcessTimeRef.current = now
    const queue = emojiQueueRef.current
    emojiQueueRef.current = []
    
    if (queue.length === 0) {
      processingRef.current = false
      return
    }

    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    
    // Group emojis by type and count for batching
    const emojiGroups = new Map<string, number>()
    queue.forEach(item => {
      emojiGroups.set(item.emoji, (emojiGroups.get(item.emoji) || 0) + 1)
    })

    const newEmojis: EmojiReaction[] = []
    
    emojiGroups.forEach((count, emoji) => {
      // Limit to max 3 emojis of the same type to prevent spam
      const displayCount = Math.min(count, 3)
      
      for (let i = 0; i < displayCount; i++) {
        const startX = Math.random() * rect.width
        const startY = rect.height + 50 + (i * 20) // Stagger multiple emojis
        const animationDuration = 2500 + Math.random() * 1500 // Faster animations
        
        const newEmoji: EmojiReaction = {
          id: `${Date.now()}-${Math.random()}-${i}`,
          emoji,
          startX,
          startY,
          startTime: now,
          animationDuration,
          count: count > 1 ? count : undefined
        }
        
        newEmojis.push(newEmoji)
      }
    })

    // Limit total concurrent emojis to 30 for performance
    setFloatingEmojis(prev => {
      const currentEmojis = prev.filter(emoji => 
        now - emoji.startTime < emoji.animationDuration
      )
      
      // If we're at capacity, remove oldest emojis
      const maxEmojis = 30
      if (currentEmojis.length + newEmojis.length > maxEmojis) {
        const sorted = currentEmojis.sort((a, b) => a.startTime - b.startTime)
        const keepCount = maxEmojis - newEmojis.length
        return [...sorted.slice(-keepCount), ...newEmojis]
      }
      
      return [...currentEmojis, ...newEmojis]
    })
    
    processingRef.current = false
  }, [])

  // Memoized emoji handler with rate limiting
  const handleEmojiEvent = useCallback((p: { emoji: string }) => {
    if (p.emoji) {
      // Add to queue instead of processing immediately
      emojiQueueRef.current.push({
        emoji: p.emoji,
        timestamp: Date.now()
      })
      
      // Process queue if not already processing
      if (!processingRef.current) {
        processEmojiQueue()
      }
    }
  }, [processEmojiQueue])

  // Subscribe to emoji reactions
  useEffect(() => {
    if (!activeEvent?.id) return
    
    const cleanup = onEmoji(activeEvent.id, handleEmojiEvent)
    
    return () => cleanup?.()
  }, [activeEvent?.id, handleEmojiEvent])

  // Process queue periodically and cleanup
  useEffect(() => {
    if (!activeEvent) return

    const processInterval = setInterval(processEmojiQueue, 100)
    const cleanupInterval = setInterval(() => {
      const now = Date.now()
      const currentEmojis = emojisRef.current
      const filtered = currentEmojis.filter(emoji => 
        now - emoji.startTime < emoji.animationDuration
      )
      
      // Only update state if we actually removed emojis
      if (filtered.length !== currentEmojis.length) {
        setFloatingEmojis(filtered)
      }
    }, 2000)

    return () => {
      clearInterval(processInterval)
      clearInterval(cleanupInterval)
    }
  }, [activeEvent, processEmojiQueue])

  // Memoized emoji rendering with CSS animations
  const renderedEmojis = useMemo(() => {
    return floatingEmojis.map((emoji) => {
      const startX = emoji.startX
      const startY = emoji.startY
      const duration = emoji.animationDuration / 1000

      return (
        <div
          key={emoji.id}
          className="absolute pointer-events-none select-none floating-emoji"
          style={{
            '--start-x': `${startX}px`,
            '--start-y': `${startY}px`,
            '--duration': `${duration}s`,
            left: `${startX}px`,
            top: `${startY}px`,
            fontSize: emoji.count && emoji.count > 1 ? '1.5rem' : '2rem',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            animation: `floatUp var(--duration) ease-out forwards`
          } as React.CSSProperties & { [key: string]: string }}
        >
          {emoji.emoji}
          {emoji.count && emoji.count > 1 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {emoji.count > 99 ? '99+' : emoji.count}
            </span>
          )}
        </div>
      )
    })
  }, [floatingEmojis])

  // Simple authorization check
  if (!token) {
    return (
      <div className="fixed inset-0 bg-black text-white flex items-center justify-center text-2xl font-bold">
        Unauthorized - No token provided
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-transparent flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  // No active event - show simple message
  if (!activeEvent) {
    return (
      <div className="fixed inset-0 bg-black/90 text-white flex items-center justify-center">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold mb-4">No Active Event</h2>
          <p className="text-gray-300">
            There is currently no active event running. Emoji reactions will only work during live events.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* CSS animations defined inline for performance */}
      <style jsx>{`
        @keyframes floatUp {
          0% {
            transform: translate3d(0, 0, 0) scale(0.8);
            opacity: 1;
          }
          80% {
            transform: translate3d(0, -100vh, 0) scale(1.2);
            opacity: 1;
          }
          100% {
            transform: translate3d(0, -100vh, 0) scale(1.2);
            opacity: 0;
          }
        }
        
        .floating-emoji {
          animation: floatUp var(--duration) ease-out forwards;
        }
      `}</style>
      
      <div 
        ref={containerRef}
        className="fixed inset-0 bg-transparent pointer-events-none overflow-hidden emoji-overlay"
        style={{ 
          background: 'transparent',
          WebkitBackgroundClip: 'transparent'
        }}
      >
        {renderedEmojis}
      </div>
    </>
  )
}
