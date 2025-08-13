'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { connectEmoji, onEmoji } from '@/lib/realtime/emoji'
import { isAuthorized } from '../_lib/token'
import Message from '@/components/Message'
import Image from 'next/image'
import { getActivePoll } from '@/lib/polls/api'
import { dotemp } from '@/lib/fonts'
import type { Poll } from '@/lib/polls/api'

interface Message {
  id: string
  content: string
  user_id: string
  created_at: string
  approved: boolean
  denied: boolean
  starred: boolean
  pinned: boolean
  sender_name?: string
  upvote_count?: number
  anonymous: boolean
}

interface ActiveEvent {
  id: string
  title: string
}

interface EmojiBurst {
  id: string
  emoji: string
  startX: number
}

export default function ChatPresenterPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [emojiBursts, setEmojiBursts] = useState<EmojiBurst[]>([])
  const [profileMap, setProfileMap] = useState<{ [key: string]: { id: string; username?: string; star_count?: number; profile_icon?: string; first_name?: string; role?: string } }>({})
  const [messageUpvotes, setMessageUpvotes] = useState<{ [key: string]: number }>({})
  const [_userUpvotes, setUserUpvotes] = useState<{ [key: string]: boolean }>({})
  const [lastPosition, setLastPosition] = useState<number>(-1)
  const [_activePoll, setActivePoll] = useState<Poll | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const messageSubscriptionRef = useRef<(() => void) | null>(null)
  const emojiSubscriptionRef = useRef<(() => void) | null>(null)
  const emojiSubscriptionActiveRef = useRef<boolean>(false)

  console.log('ChatPresenterPage component mounted')

  // Animate emoji function - always works for incoming emojis
  const animateEmoji = useCallback((emoji: string) => {
    const emojiId = `${emoji}-${Date.now()}-${Math.random()}`
    
    // Generate random position, avoiding the last used position
    let randomPosition: number
    do {
      randomPosition = Math.floor(Math.random() * 15) // 0-14
    } while (randomPosition === lastPosition)
    
    const startX = 10 + randomPosition * 5.33 // Convert to percentage
    setLastPosition(randomPosition)
    setEmojiBursts((prev) => [...prev, { 
      id: emojiId, 
      emoji, 
      startX 
    }])

    // Clear the emoji after 5 seconds
    setTimeout(() => {
      setEmojiBursts((prev) => prev.filter(e => e.id !== emojiId))
    }, 5000)
  }, [lastPosition])

  // Fetch active event
  useEffect(() => {
    const fetchActiveEvent = async () => {
      try {
        console.log('Chat monitor: Fetching active event...')
        
        const { data: eventData, error } = await supabase
          .from('events')
          .select('id, title, active')
          .eq('active', true)
          .maybeSingle()

        if (error) {
          console.error('Error fetching active event:', error)
          setLoading(false)
          return
        }

        if (eventData) {
          console.log('Setting active event:', eventData)
          setActiveEvent(eventData)
        } else {
          console.log('No active event found')
          setLoading(false)
        }
      } catch (error) {
        console.error('Error fetching active event:', error)
        setLoading(false)
      }
    }

    fetchActiveEvent()
  }, [])

  // Fetch messages when event changes
  useEffect(() => {
    if (!activeEvent) return

    const fetchMessages = async () => {
      try {
        console.log('Fetching messages for event:', activeEvent.id)
        
        // Use the exact same query as the chat page
        const { data: messageData, error } = await supabase
          .from('messages')
          .select('*')
          .or(`event_id.eq.${activeEvent.id},event_id.is.null`)
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Error fetching messages:', error)
          return
        }

        if (messageData) {
          console.log('Messages found:', messageData)
          console.log('Number of messages:', messageData.length)
          setMessages(messageData)
        } else {
          console.log('No messages found')
        }
        setLoading(false)
      } catch (error) {
        console.error('Error fetching messages:', error)
        setLoading(false)
      }
    }

    fetchMessages()
  }, [activeEvent])

  // Subscribe to new messages
  useEffect(() => {
    if (!activeEvent) return

    console.log('Setting up message subscription for event:', activeEvent.id)
    
    const channel = supabase
      .channel(`messages-${activeEvent.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `event_id=eq.${activeEvent.id}`
        },
        (payload) => {
          console.log('New message received:', payload.new)
          const newMessage = payload.new as Message
          
          // Only add approved messages that aren't denied
          if (newMessage.approved && !newMessage.denied) {
            setMessages(prev => [...prev, newMessage])
          }
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'messages',
          filter: `event_id=eq.${activeEvent.id}`
        },
        (payload) => {
          console.log('Message updated:', payload.new)
          const updatedMessage = payload.new as Message
          
          setMessages(prev => 
            prev.map(msg => 
              msg.id === updatedMessage.id ? updatedMessage : msg
            ).filter(msg => msg.approved && !msg.denied)
          )
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'messages',
          filter: `event_id=eq.${activeEvent.id}`
        },
        (payload) => {
          console.log('Message deleted:', payload.old)
          const deletedMessage = payload.old as Message
          
          setMessages(prev => 
            prev.filter(msg => msg.id !== deletedMessage.id)
          )
        }
      )
      .subscribe()

    messageSubscriptionRef.current = () => {
      supabase.removeChannel(channel)
    }

    return () => {
      if (messageSubscriptionRef.current) {
        messageSubscriptionRef.current()
      }
    }
  }, [activeEvent])

  // Subscribe to emoji reactions
  useEffect(() => {
    if (!activeEvent?.id || emojiSubscriptionActiveRef.current) return

    console.log('Chat monitor: Subscribing to emoji channel for event:', activeEvent.id)
    emojiSubscriptionActiveRef.current = true

    const cleanup = onEmoji(activeEvent.id, (p) => {
      console.log('Chat monitor: Received emoji broadcast:', p)
      const emoji = p.emoji
      console.log('Chat monitor: Animating emoji:', emoji)
      animateEmoji(emoji)
    })

    // Ensure joined to the channel
    connectEmoji(activeEvent.id).then(() => {
      console.log('Chat monitor: Successfully connected to emoji channel')
    }).catch(error => {
      console.error('Chat monitor: Error connecting to emoji channel:', error)
    })

    emojiSubscriptionRef.current = () => {
      console.log('Chat monitor: Cleaning up emoji subscription')
      cleanup?.()
      emojiSubscriptionActiveRef.current = false
    }

    return () => {
      if (emojiSubscriptionRef.current) {
        emojiSubscriptionRef.current()
      }
    }
  }, [activeEvent?.id, animateEmoji])

  // Fetch user profiles for display names
  useEffect(() => {
    if (!messages.length) return

    const fetchProfiles = async () => {
      try {
        const userIds = [...new Set(messages.map(m => m.user_id))]
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, first_name, username, star_count, role, profile_icon')
          .in('id', userIds)

        if (error) {
          console.error('Error fetching profiles:', error)
          return
        }

        if (profiles) {
          const profileMap = Object.fromEntries(
            profiles.map(p => [p.id, p])
          )
          setProfileMap(profileMap)
        }
      } catch (error) {
        console.error('Error fetching profiles:', error)
      }
    }

    fetchProfiles()
  }, [messages])

  // Load upvotes for messages
  const loadUpvotes = async () => {
    if (!activeEvent) return

    try {
      console.log('Loading upvotes for event:', activeEvent.id)
      
      // Get upvotes for messages in the active event
      const { data: allUpvotes } = await supabase
        .from('message_upvotes')
        .select('message_id')
        .eq('event_id', activeEvent.id)

      if (allUpvotes) {
        const upvoteMap: { [key: string]: number } = {}
        allUpvotes.forEach((item: { message_id: string }) => {
          upvoteMap[item.message_id] = (upvoteMap[item.message_id] || 0) + 1
        })
        setMessageUpvotes(upvoteMap)
        console.log('Upvotes loaded:', upvoteMap)
      }
    } catch (error) {
      console.error('Error loading upvotes:', error)
    }
  }

  // Load upvotes when event changes
  useEffect(() => {
    if (activeEvent) {
      loadUpvotes()
    }
  }, [activeEvent])

  // Real-time subscription for upvotes
  useEffect(() => {
    if (!activeEvent?.id) return

    console.log('Setting up upvote real-time subscriptions for event:', activeEvent.id)

    const upvoteChannel = supabase
      .channel('upvote-updates-presenter')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'message_upvotes'
        },
        (payload) => {
          const newUpvote = payload.new as any
          console.log('🎯 New upvote received (presenter):', newUpvote)
          // Only update if the message is in our current messages list
          if (messages.some(m => m.id === newUpvote.message_id)) {
            setMessageUpvotes(prev => ({
              ...prev,
              [newUpvote.message_id]: (prev[newUpvote.message_id] || 0) + 1
            }))
            console.log('✅ Upvote count updated for message:', newUpvote.message_id)
          }
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'message_upvotes'
        },
        (payload) => {
          const deletedUpvote = payload.old as any
          console.log('🗑️ Upvote removed (presenter):', deletedUpvote)
          // Only update if the message is in our current messages list
          if (messages.some(m => m.id === deletedUpvote.message_id)) {
            setMessageUpvotes(prev => ({
              ...prev,
              [deletedUpvote.message_id]: Math.max(0, (prev[deletedUpvote.message_id] || 0) - 1)
            }))
            console.log('✅ Upvote count updated for message:', deletedUpvote.message_id)
          }
        }
      )
      .subscribe((status) => {
        console.log('Presenter upvote subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Presenter upvote real-time subscription active')
        } else {
          console.log('❌ Presenter upvote subscription failed:', status)
        }
      })

    return () => {
      console.log('Cleaning up presenter upvote real-time subscription')
      supabase.removeChannel(upvoteChannel)
    }
  }, [activeEvent?.id, messages])

  // Cleanup subscriptions
  useEffect(() => {
    return () => {
      if (messageSubscriptionRef.current) {
        messageSubscriptionRef.current()
      }
      if (emojiSubscriptionRef.current) {
        emojiSubscriptionRef.current()
      }
      // Reset subscription flags
      emojiSubscriptionActiveRef.current = false
      // Emoji channel cleanup is handled by the helper functions
    }
  }, [])

  // Reset emoji subscription when active event changes
  useEffect(() => {
    emojiSubscriptionActiveRef.current = false
  }, [activeEvent?.id])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold">Loading Chat Monitor...</h1>
        </div>
      </div>
    )
  }

  // No active event
  if (!activeEvent) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">No Active Event</h1>
          <p className="text-xl mb-4">There is currently no active event</p>
          <p className="text-lg text-gray-400">Please check with an administrator to activate an event</p>
        </div>
      </div>
    )
  }

  // Utility function to get user display information (same as chat page)
  const getUserDisplayInfo = (userId: string, message: Message) => {
    const user = profileMap[userId] || {}
    const starCount = user.star_count || 0
    
    return {
      name: message.anonymous
        ? 'Anonymous'
        : user.first_name || message.sender_name || userId.slice(0, 6),
      starCount,
      nameStyle: {
        color: starCount >= 30 ? '#DAA520' : starCount >= 10 ? '#00BFFF' : 'inherit'
      },
      badge: (() => {
        if (starCount >= 50) return ' 🏆'
        if (starCount >= 40) return ' 🗝️'
        if (starCount >= 30) return ' ✝️'
        if (starCount >= 25) return ' 🧓'
        if (starCount >= 20) return ' 🐑'
        if (starCount >= 15) return ' 🛎️'
        if (starCount >= 10) return ' 🏛️'
        if (starCount >= 6) return ' 🤝'
        if (starCount >= 3) return ' 📚'
        if (starCount >= 1) return ' 🔍'
        return ''
      })(),
      tagline: (() => {
        if (starCount >= 50) return 'Champion'
        if (starCount >= 40) return 'Steward'
        if (starCount >= 30) return 'Apostle'
        if (starCount >= 25) return 'Elder'
        if (starCount >= 20) return 'Shepherd'
        if (starCount >= 15) return 'Deacon'
        if (starCount >= 10) return 'Israelite'
        if (starCount >= 6) return 'Samaritan'
        if (starCount >= 3) return 'Disciple'
        if (starCount >= 1) return 'Seeker'
        return ''
      })(),
      score: starCount * 100
    }
  }

  // Dummy moderation handler (not needed for monitor view)
  const handleModeration = (messageId: string, action: string) => {
    console.log('Moderation action:', action, 'on message:', messageId)
  }

  // Dummy upvote handler (not needed for monitor view)
  const handleUpvote = (messageId: string) => {
    console.log('Upvote on message:', messageId)
  }

  // Token validation - moved here after all hooks
  if (!token) {
    console.log('No token provided')
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Access Denied</h1>
          <p className="text-xl">No token provided</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized(token)) {
    console.log('Invalid token')
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Access Denied</h1>
          <p className="text-xl">Invalid token</p>
        </div>
      </div>
    )
  }

  console.log('Token validation passed, proceeding with component')

  return (
    <div 
      ref={containerRef}
      className="h-screen bg-black text-white overflow-hidden flex flex-col"
    >
      {/* Logo at top right */}
      <div className="absolute top-0 right-8 z-30">
        <Image
          src="/LogoHalfFix.png"
          alt="YAP Logo"
          width={80}
          height={80}
          priority
        />
      </div>

      {/* Fixed Content Area - Shows only recent messages */}
      <div className="flex-1 overflow-hidden flex justify-center">
        <div className="w-3/5 max-w-4xl">
          <div className="h-full px-6 py-4 flex flex-col justify-end">
            <div className="space-y-6 text-3xl">
              {messages
                .filter((msg) => {
                  // Show all non-denied messages (same as chat page for moderators)
                  return !msg.denied
                })
                .sort((a, b) => {
                  // Sort by pinned first, then by creation time (same as chat page)
                  if (a.pinned && !b.pinned) return 1
                  if (!a.pinned && b.pinned) return -1
                  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                })
                .slice(-6) // Show only the 6 most recent messages
                .map((msg) => {
                  const user = profileMap[msg.user_id] || {}
                  const userDisplayInfo = getUserDisplayInfo(msg.user_id, msg)
                  
                  return (
                    <Message
                      key={msg.id}
                      id={msg.id}
                      content={msg.content}
                      userId={msg.user_id}
                      userName={userDisplayInfo.name}
                      userRole={user.role || 'user'}
                      userScore={userDisplayInfo.score}
                      profileIcon={user.profile_icon}
                      createdAt={msg.created_at}
                      approved={msg.approved}
                      denied={msg.denied}
                      starred={msg.starred}
                      pinned={msg.pinned}
                      isMod={false} // Not a moderator in monitor view
                      upvoteCount={messageUpvotes[msg.id] || 0}
                      userHasUpvoted={_userUpvotes[msg.id] || false}
                      hasActiveEvent={!!activeEvent}
                      isOwnMessage={false} // Not own message in monitor view
                      textSize="3xl"
                      onModeration={handleModeration}
                      onUpvote={handleUpvote}
                    />
                  )
                })}
              
              {/* Debug Information */}
              {messages.length === 0 && (
                <div className="text-center py-8 bg-gray-800 rounded-lg">
                  <div className="text-4xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">No Messages Found</h3>
                  <p className="text-gray-400 mb-4">This could mean:</p>
                  <ul className="text-sm text-gray-500 space-y-1 text-left max-w-md mx-auto">
                    <li>• No messages have been sent yet</li>
                    <li>• Messages exist but aren&apos;t for this event</li>
                    <li>• Messages table doesn&apos;t exist (run messages_table_setup.sql)</li>
                    <li>• No active event is configured</li>
                  </ul>
                  <div className="mt-4 p-3 bg-gray-700 rounded text-xs text-gray-300">
                    <strong>Debug Info:</strong><br/>
                    Event ID: {activeEvent?.id}<br/>
                    Event Title: {activeEvent?.title}<br/>
                    Messages Array Length: {messages.length}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating emojis - Same as chat page */}
      <div className="absolute inset-0 pointer-events-none z-50">
        {emojiBursts.map((emojiObj) => (
          <div
            key={emojiObj.id}
            className="absolute text-4xl"
            style={{
              left: `${emojiObj.startX}%`,
              bottom: '120px',
              animation: 'floatHigher 3s ease-out forwards',
            }}
          >
            {emojiObj.emoji}
          </div>
        ))}
      </div>
    </div>
  )
}
