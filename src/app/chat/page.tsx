// /chat/page.tsx (gamified with admin button for mods)

'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { connectEmoji, sendEmoji, onEmoji } from '@/lib/realtime/emoji'
import { useRouter } from 'next/navigation'
import { useRealtimePolls } from '@/components/RealtimePollProvider'
import ChatBanner from '@/components/ChatBanner'
import Message from '@/components/Message'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Smile, OctagonX, Send, MessageSquare, BarChart3 } from 'lucide-react'
import Image from "next/image"

import VerificationPrompt from '@/components/VerificationPrompt'
import { useVerificationModal } from '@/lib/useVerificationModal'
import VerificationRequiredModal from '@/components/VerificationRequiredModal'
import HamburgerMenu from '@/components/HamburgerMenu'
import BannerForm from '@/components/BannerForm'
import PollTrigger from '@/components/PollTrigger'
import PollModal from '@/components/PollModal'
import PollCreator from '@/components/PollCreator'
import ErrorBoundary from '@/components/ErrorBoundary'
import LoadingSpinner from '@/components/LoadingSpinner'
import { gothamUltra } from '@/lib/fonts'

// Type definitions for better type safety
type Message = {
  id: string
  content: string
  user_id: string
  created_at: string
  anonymous: boolean
  approved: boolean
  denied: boolean
  starred: boolean
  pinned: boolean
  sender_name?: string
  upvote_count?: number
  user_has_upvoted?: boolean
}

type Profile = {
  id: string
  username?: string
  first_name?: string
  role?: string
  star_count: number
  ban_until?: string
  verified?: boolean
  campus_id?: string
  profile_icon?: string
}

// Poll type is now imported from @/lib/polls/api

export default function ChatPage() {
  const router = useRouter()
  const { showVerificationModal, isVerificationModalOpen, featureName, hideVerificationModal } = useVerificationModal()
  
  // State management for chat functionality
  const [profile, setProfile] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [profileMap, setProfileMap] = useState<{ [key: string]: Profile }>({})
  const [loading, setLoading] = useState(true)
  const [activeEvent, setActiveEvent] = useState<{ id: string; title?: string; active?: boolean; starts_at?: string; ends_at?: string } | null>(null)
  
  // Poll state
  const [showPollModal, setShowPollModal] = useState(false)
  const [showPollCreationModal, setShowPollCreationModal] = useState(false)
  
  // Real-time poll context
  const { activePolls } = useRealtimePolls()
  const activePoll = activeEvent ? activePolls[activeEvent.id] : null

  // Check for active poll on page load
  useEffect(() => {
    if (activeEvent && profile) {
      // The RealtimePollProvider will automatically check for active polls
      // and update the activePolls state via real-time subscriptions
      console.log('Chat page: Checking for active polls on event:', activeEvent.id)
      console.log('Chat page: Current activePolls state:', activePolls)
      console.log('Chat page: Active poll for this event:', activePoll)
    }
  }, [activeEvent, profile, activePolls, activePoll])

  // Upvote-related state
  const [messageUpvotes, setMessageUpvotes] = useState<{ [key: string]: number }>({})
  const [userUpvotes, setUserUpvotes] = useState<{ [key: string]: boolean }>({})

  // Event countdown state
  const [_eventCountdown, setEventCountdown] = useState<{
    timeToStart?: string
    timeToEnd?: string
  }>({})

  // Emoji reactions state
  const [reactionsEnabled, setReactionsEnabled] = useState(false)
  const [floatingEmojis, setFloatingEmojis] = useState<{ emoji: string; id: string; startX: number }[]>([])
  const [lastPosition, setLastPosition] = useState<number>(-1)

  // Chat freeze state
  const [chatFrozen, setChatFrozen] = useState(false)

  // Verification prompt state
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false)
  const [verificationFeature, setVerificationFeature] = useState('')



  // Modal states
  const [showBannerModal, setShowBannerModal] = useState(false)
  const [lastBanner, setLastBanner] = useState<{ id: string; message?: string; link_type?: string; link_url?: string; share_message?: string } | null>(null)

  // Emoji reactions toggle state
  const [showEmojiBar, setShowEmojiBar] = useState(false)
  const [showReactionsNotification, setShowReactionsNotification] = useState(false)
  const [showEmojiButton, setShowEmojiButton] = useState(false)
  const [buttonBurstingAway, setButtonBurstingAway] = useState(false)

  // Refs for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const emojiBarRef = useRef<HTMLDivElement>(null)
  const emojiToggleRef = useRef<HTMLButtonElement>(null)
  const _previousMessageCount = useRef(messages.length)
  const lastMessageId = useRef<string | null>(null)

  // Check if user has moderation privileges
  const isMod = profile?.role === 'mod' || profile?.role === 'speaker'

  // Function to fetch and update polls (now handled by real-time context)
  const fetchPolls = async () => {
    // Polls are now automatically updated via real-time subscriptions
    console.log('Polls are automatically updated via real-time subscriptions')
  }

  // Auto-scroll to bottom function
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
    // Also try to scroll the ScrollArea if available
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }

  // Animate emoji function (used for both local and remote emojis)
  const animateEmoji = useCallback((emoji: string) => {
    const emojiId = `${emoji}-${Date.now()}-${Math.random()}`
    
    // Generate random position, avoiding the last used position
    let randomPosition: number
    do {
      randomPosition = Math.floor(Math.random() * 15) // 0-14
    } while (randomPosition === lastPosition)
    
    const startX = 10 + randomPosition * 5.33 // Convert to percentage
    setLastPosition(randomPosition)
    setFloatingEmojis((prev) => [...prev, { emoji, id: emojiId, startX }])

    // Clear the emoji after 5 seconds
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter(e => e.id !== emojiId))
    }, 5000)
  }, [lastPosition])

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
        error
      } = await supabase.auth.getUser()

      if (!user || error) {
        router.push('/signup')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profileData) {
        router.push('/signup')
        return
      }

      setProfile(profileData)

      // Load all profiles after user profile is confirmed
      const { data: allProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, star_count, profile_icon')
      
      if (profileError) {
        console.error('Error loading profiles:', profileError)
      } else if (allProfiles) {
        const map = Object.fromEntries((allProfiles.map((p) => [p.id, p])))
        setProfileMap(map)
      }

      // Get the currently active event
      const { data: activeEventData } = await supabase
        .from('events')
        .select('*')
        .eq('active', true)
        .single()

      setActiveEvent(activeEventData)

      // Fetch active poll for the current event and check user vote
      if (activeEventData && profileData) {
        await fetchPolls()
      }

      const { data: initialMessages } = await supabase
        .from('messages')
        .select('*')
        .or(`event_id.eq.${activeEventData?.id || 'null'},event_id.is.null`)
        .order('created_at', { ascending: true })

      if (initialMessages) setMessages(initialMessages)

      // Fetch active poll for the current event and check user vote
      // Note: fetchPolls will be called after activeEvent is set

      // Check chat frozen flag
      const { data: freezeFlag } = await supabase
        .from('flags')
        .select('value')
        .eq('key', 'chat_frozen')
        .single()

      if (freezeFlag?.value) setChatFrozen(true)

      // Check emoji flag
      const { data: emojiFlag } = await supabase
        .from('flags')
        .select('value')
        .eq('key', 'reactions_enabled')
        .single()

      console.log('Initial emoji flag value:', emojiFlag?.value)
      setReactionsEnabled(emojiFlag?.value || false)



      // Load upvote data
      await loadUpvotes()

      // Real-time flag subscriptions are now handled in a separate useEffect



      // Subscribe to profile changes for real-time star count updates
      supabase
        .channel('profile-updates')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles' },
          (payload) => {
            console.log('Profile updated:', payload.new)
            console.log('Profile icon changed to:', payload.new.profile_icon)
            const updatedProfile = payload.new as Profile
            
            // Update profileMap for other users
            setProfileMap((prev) => ({
              ...prev,
              [updatedProfile.id]: updatedProfile
            }))
            
            // If this is the current user's profile, update their profile state too
            if (profile && updatedProfile.id === profile.id) {
              setProfile(updatedProfile)
            }
            
            // Also refresh the profile map to get updated icons for all users
            refreshProfiles()
          }
        )
        .subscribe()



      // Poll subscriptions are now handled by PollTrigger component

      // Real-time upvote subscriptions are now handled in a separate useEffect

      setLoading(false)
    }

    init()
  }, [])

  // Subscribe to emoji channel for real-time reactions
  useEffect(() => {
    if (!activeEvent?.id) return
    
    console.log('Chat: Connecting to emoji channel for event:', activeEvent.id)
    
    // Subscribe to receive emoji broadcasts from other users
    const cleanup = onEmoji(activeEvent.id, (p) => {
      console.log('Chat: Received emoji broadcast:', p)
      const emoji = p.emoji
      console.log('Chat: Animating emoji:', emoji)
      animateEmoji(emoji)
    })
    
    // Connect to the emoji channel for this event
    connectEmoji(activeEvent.id).then(() => {
      console.log('Chat: Connected to emoji channel')
    }).catch(error => {
      console.error('Chat: Error connecting to emoji channel:', error)
    })

    // Clean up when component unmounts
    return () => {
      console.log('Chat: Cleaning up emoji channel subscription')
      cleanup?.()
    }
  }, [activeEvent?.id, animateEmoji])

  // Real-time subscription for flags
  useEffect(() => {
    if (!profile) return

    console.log('Setting up flags real-time subscriptions for profile:', profile.id)

    // Subscribe to emoji reactions flag changes
    const emojiChannel = supabase
      .channel('emoji-reactions-flag')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'flags', filter: 'key=eq.reactions_enabled' },
        (payload) => {
          console.log('🎉 Emoji reactions flag updated via real-time:', payload.new.value)
          console.log('Previous state:', reactionsEnabled, '→ New state:', payload.new.value)
          setReactionsEnabled(payload.new.value)
        }
      )
      .subscribe((status) => {
        console.log('Emoji reactions subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Emoji reactions real-time subscription active')
        } else {
          console.log('❌ Emoji reactions subscription failed:', status)
        }
      })

    // Subscribe to chat freeze flag changes
    const freezeChannel = supabase
      .channel('chat-freeze-flag')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'flags', filter: 'key=eq.chat_frozen' },
        (payload) => {
          console.log('🧊 Chat freeze flag updated via real-time:', payload.new.value)
          console.log('Previous state:', chatFrozen, '→ New state:', payload.new.value)
          setChatFrozen(payload.new.value)
        }
      )
      .subscribe((status) => {
        console.log('Chat freeze subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Chat freeze real-time subscription active')
        } else {
          console.log('❌ Chat freeze subscription failed:', status)
        }
      })

    console.log('Flags real-time subscriptions setup complete')

    return () => {
      console.log('Cleaning up flags real-time subscriptions')
      supabase.removeChannel(emojiChannel)
      supabase.removeChannel(freezeChannel)
    }
  }, [profile])

  // Real-time subscription for upvotes
  useEffect(() => {
    if (!activeEvent?.id) return

    console.log('Setting up upvote real-time subscriptions for event:', activeEvent.id)

    const upvoteChannel = supabase
      .channel('upvote-updates')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'message_upvotes'
        },
        (payload) => {
          const newUpvote = payload.new as { message_id: string }
          console.log('🎯 New upvote received:', newUpvote)
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
          const deletedUpvote = payload.old as { message_id: string }
          console.log('🗑️ Upvote removed:', deletedUpvote)
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
        console.log('Upvote subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Upvote real-time subscription active')
        } else {
          console.log('❌ Upvote subscription failed:', status)
        }
      })

    return () => {
      console.log('Cleaning up upvote real-time subscription')
      supabase.removeChannel(upvoteChannel)
    }
  }, [activeEvent?.id, messages])

  // Ensure profiles are loaded when component mounts
  useEffect(() => {
    if (profile && Object.keys(profileMap).length === 0) {
      refreshProfiles()
    }
  }, [profile, profileMap])

  // Auto-scroll to bottom when messages are loaded or new messages arrive
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      // Small delay to ensure DOM is rendered
      const timer = setTimeout(() => {
        scrollToBottom()
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [messages.length, loading])

  // Force scroll to bottom on initial load
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      // Immediate scroll for initial load
      scrollToBottom()
    }
  }, [loading]) // Only trigger on loading state change

  // Subscribe to message changes for the current active event
  useEffect(() => {
    console.log('Setting up message subscription for event:', activeEvent?.id || 'legacy')
    
    const messageChannel = supabase
      .channel(`messages-${activeEvent?.id || 'legacy'}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: activeEvent ? `event_id=eq.${activeEvent.id}` : 'event_id=is.null'
        },
        (payload) => {
          console.log('New message received:', payload.new)
          const newMessage = payload.new as Message
          setMessages((prev) => [...prev, newMessage])
          
          // Show notification for moderators when new pending message arrives
          if (isMod && !newMessage.approved && !newMessage.denied) {
            // You could add a sound notification here
            console.log('New pending message for moderation:', newMessage.content)
          }
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'messages',
          filter: activeEvent ? `event_id=eq.${activeEvent.id}` : 'event_id=is.null'
        },
        (payload) => {
          console.log('Message updated:', payload.new)
          setMessages((prev) =>
            prev.map((msg) => (msg.id === payload.new.id ? (payload.new as Message) : msg))
          )
        }
      )
      .subscribe()

    console.log('Message subscription active for filter:', activeEvent ? `event_id=eq.${activeEvent.id}` : 'event_id=is.null')

    // Cleanup function to unsubscribe when activeEvent changes
    return () => {
      console.log('Cleaning up message subscription')
      supabase.removeChannel(messageChannel)
    }
  }, [activeEvent])

  // Fetch polls when there's an active event
  useEffect(() => {
    if (activeEvent && profile) {
      fetchPolls()
    }
  }, [activeEvent, profile])

  // Poll state debugging removed - now handled by PollTrigger component

          // Poll subscriptions are now handled by PollTrigger component



  // Auto-scroll to bottom only when a truly new message is added
  useEffect(() => {
    if (messages.length > 0) {
      const currentLastMessageId = messages[messages.length - 1].id
      
      // Only scroll if we have a new message (different ID)
      if (currentLastMessageId !== lastMessageId.current) {
        scrollToBottom()
        lastMessageId.current = currentLastMessageId
      }
    }
  }, [messages])

  // Handle clicking outside emoji bar and poll callout to close them
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      // Close emoji bar if clicking outside
      if (
        showEmojiBar &&
        emojiBarRef.current &&
        emojiToggleRef.current &&
        !emojiBarRef.current.contains(event.target as Node) &&
        !emojiToggleRef.current.contains(event.target as Node)
      ) {
        setShowEmojiBar(false)
      }

      // Note: Poll callout closing is now handled manually via the close button
      // This prevents interference with the poll button hover states
    }

    if (showEmojiBar) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [showEmojiBar])

  // Simple emoji button visibility logic
  useEffect(() => {
    const shouldShowButton = reactionsEnabled && activeEvent && profile
    
    console.log('Emoji button visibility check:', {
      reactionsEnabled,
      hasActiveEvent: !!activeEvent,
      profileVerified: profile?.verified,
      shouldShowButton,
      currentShowEmojiButton: showEmojiButton
    })
    
    if (shouldShowButton) {
      // Show emoji button when reactions are enabled, there's an active event, and user is verified
      console.log('🎯 Setting showEmojiButton to true')
      setShowEmojiButton(true)
      setShowReactionsNotification(false)
      setButtonBurstingAway(false)
    } else {
      // Hide emoji button when any condition is not met
      console.log('🚫 Setting showEmojiButton to false')
      setShowEmojiButton(false)
      setShowReactionsNotification(false)
      setButtonBurstingAway(false)
      setShowEmojiBar(false) // Close emoji bar if open
    }
  }, [reactionsEnabled, activeEvent, profile?.verified, showEmojiButton])



  // Set up event countdown interval
  useEffect(() => {
    // Calculate initial countdown
    calculateEventCountdown()

    // Set up interval to update countdown every minute
    const interval = setInterval(calculateEventCountdown, 60000)

    return () => clearInterval(interval)
  }, [activeEvent])

  // Handle sending new messages with moderation checks
  const handleSend = async () => {
    if (!newMessage.trim() || !profile) return

    // Check if there's an active event
    if (!activeEvent) {
      alert('⛔ There is no active event right now. Come back during the next service.')
      return
    }



    // Check if user is banned/muted
    if (profile.ban_until && new Date(profile.ban_until) > new Date()) {
      alert(`You are muted until ${new Date(profile.ban_until).toLocaleTimeString()}.`)
      return
    }

    // Auto-approve messages only from leaders, speakers, and mods
    // Student role messages always go through moderation regardless of verification status
    const isAutoApproved = ['mod', 'leader', 'speaker'].includes(profile.role || '')

    const { error } = await supabase.from('messages').insert([
      {
        content: newMessage,
        user_id: profile.id,
        anonymous: false,
        approved: isAutoApproved,
        sender_name: profile.username || profile.first_name,
        event_id: activeEvent.id
      }
    ])

    if (!error) {
      console.log('Message sent successfully')
      setNewMessage('')
    } else {
      console.error('Error sending message:', error)
    }
  }





  // Utility function to get user display information
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

  // Handle emoji reaction clicks
  const handleEmojiClick = async (emoji: string) => {
    // Check if there's an active event
    if (!activeEvent) {
      alert('⛔ There is no active event right now. Come back during the next service.')
      return
    }

    // Check if profile is complete
    if (!profile?.verified) {
      showVerificationModal('emoji reactions')
      return
    }

    // 1. Show local animation
    animateEmoji(emoji)

    // 2. Broadcast to others using the new helper
    try {
      console.log('Chat: Broadcasting emoji:', emoji)
      await sendEmoji(activeEvent.id, { emoji, uid: profile.id })
      console.log('Chat: Emoji broadcast sent successfully')
    } catch (error) {
      console.error('Chat: Error broadcasting emoji:', error)
    }
  }

  // Refresh profile data to get updated star counts
  const refreshProfiles = async () => {
    const { data: allProfiles, error } = await supabase
      .from('profiles')
      .select('id, username, star_count, profile_icon')
    
    if (error) {
      console.error('Error refreshing profiles:', error)
      return
    }
    
    if (allProfiles) {
      // Debug: Log all profile icons to see what's in the database
      if (process.env.NODE_ENV === 'development') {
        console.log('All profiles with icons:', allProfiles.map(p => ({ 
          id: p.id, 
          username: p.username, 
          profile_icon: p.profile_icon 
        })))
      }
      
      const map = Object.fromEntries((allProfiles.map((p) => [p.id, p])))
      setProfileMap(map)
      
      // Note: Profile updates are no longer broadcast via emoji channel
      // as we're using the new event-specific emoji system
    }
  }

  // Calculate event countdown
  const calculateEventCountdown = () => {
    if (!activeEvent) {
      setEventCountdown({})
      return
    }

    const now = new Date()
            const startTime = activeEvent.starts_at ? new Date(activeEvent.starts_at) : new Date()
        const endTime = activeEvent.ends_at ? new Date(activeEvent.ends_at) : new Date()

    let timeToStart: string | undefined
    let timeToEnd: string | undefined

    // Calculate time to start
    if (startTime > now) {
      const diff = startTime.getTime() - now.getTime()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      
      if (hours > 0) {
        timeToStart = `${hours}h ${minutes}m`
      } else {
        timeToStart = `${minutes}m`
      }
    }

    // Calculate time to end
    if (endTime > now) {
      const diff = endTime.getTime() - now.getTime()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      
      if (hours > 0) {
        timeToEnd = `${hours}h ${minutes}m`
      } else {
        timeToEnd = `${minutes}m`
      }
    }

    setEventCountdown({ timeToStart, timeToEnd })
  }

  // Load upvote data for all messages
  const loadUpvotes = async () => {
    if (!profile) return

    try {
      // Get the currently active event
      const { data: activeEvent } = await supabase
        .from('events')
        .select('*')
        .eq('active', true)
        .single()

      // Get message IDs for the active event (including legacy messages with null event_id)
      const { data: eventMessages } = await supabase
        .from('messages')
        .select('id')
        .or(`event_id.eq.${activeEvent?.id || 'null'},event_id.is.null`)

      if (!eventMessages || eventMessages.length === 0) {
        setMessageUpvotes({})
        setUserUpvotes({})
        return
      }

      const messageIds = eventMessages.map(msg => msg.id)

      // Get upvotes for messages in the active event
      const { data: allUpvotes } = await supabase
        .from('message_upvotes')
        .select('message_id')
        .in('message_id', messageIds)

      if (allUpvotes) {
        const upvoteMap: { [key: string]: number } = {}
        allUpvotes.forEach((item: { message_id: string }) => {
          upvoteMap[item.message_id] = (upvoteMap[item.message_id] || 0) + 1
        })
        setMessageUpvotes(upvoteMap)
      }

      // Get user's upvotes for messages in the active event
      const { data: userUpvoteData } = await supabase
        .from('message_upvotes')
        .select('message_id')
        .eq('user_id', profile.id)
        .in('message_id', messageIds)

      if (userUpvoteData) {
        const userUpvoteMap: { [key: string]: boolean } = {}
        userUpvoteData.forEach((item: { message_id: string }) => {
          userUpvoteMap[item.message_id] = true
        })
        setUserUpvotes(userUpvoteMap)
      }
    } catch (error) {
      console.error('Error loading upvotes:', error)
    }
  }

  // Handle upvote toggle
  const handleUpvote = async (messageId: string) => {
    if (!profile) return

    // Check if there's an active event
    if (!activeEvent) {
      alert('⛔ There is no active event right now. Come back during the next service.')
      return
    }

    // Check if profile is complete for upvoting
    if (!profile.verified) {
      setVerificationFeature('Message Upvoting')
      setShowVerificationPrompt(true)
      return
    }

    try {
      const hasUpvoted = userUpvotes[messageId]

      if (hasUpvoted) {
        // Remove upvote
        const { error } = await supabase
          .from('message_upvotes')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', profile.id)

        if (!error) {
          setUserUpvotes(prev => ({ ...prev, [messageId]: false }))
          setMessageUpvotes(prev => ({ 
            ...prev, 
            [messageId]: Math.max(0, (prev[messageId] || 0) - 1) 
          }))
        }
      } else {
        // Add upvote
        const { error } = await supabase
          .from('message_upvotes')
          .insert({
            message_id: messageId,
            user_id: profile.id
          })

        if (!error) {
          setUserUpvotes(prev => ({ ...prev, [messageId]: true }))
          setMessageUpvotes(prev => ({ 
            ...prev, 
            [messageId]: (prev[messageId] || 0) + 1 
          }))
        }
      }
    } catch (error) {
      console.error('Error toggling upvote:', error)
    }
  }

  // Handle moderation actions (approve, deny, star, pin, unpin)
  const handleModeration = async (
    id: string,
    action: 'approve' | 'deny' | 'star' | 'unstar' | 'pin' | 'unpin'
  ) => {
    let updateFields: { approved?: boolean; starred?: boolean; pinned?: boolean; denied?: boolean } = {}

    // Apply different moderation actions
    if (action === 'approve') updateFields = { approved: true }
    if (action === 'star') {
      updateFields = { starred: true }
      const msg = messages.find((m) => m.id === id)
      if (msg) {
        await supabase.rpc('increment_star_count', { uid: msg.user_id })
      }
    }
    if (action === 'unstar') {
      updateFields = { starred: false }
      const msg = messages.find((m) => m.id === id)
      if (msg) {
        await supabase.rpc('decrement_star_count', { uid: msg.user_id })
      }
    }
    if (action === 'pin') {
      const pinnedCount = messages.filter((m) => m.pinned).length
      if (pinnedCount >= 3) {
        alert('Only 3 messages can be pinned at once.')
        return
      }
      updateFields = { pinned: true }
    }
    if (action === 'unpin') updateFields = { pinned: false }
    if (action === 'deny') updateFields = { denied: true }

    // Update the message in the database
    if (Object.keys(updateFields).length > 0) {
      await supabase.from('messages').update(updateFields).eq('id', id)
      
      // Update local state immediately for better UX
      setMessages(prev => 
        prev.map(msg => 
          msg.id === id ? { ...msg, ...updateFields } : msg
        )
      )
    }
    
    // Refresh profiles to get updated star counts
    if (action === 'star' || action === 'unstar') {
      await refreshProfiles()
    }
  }

  // Keyboard shortcuts for moderation (only for moderators)
  useEffect(() => {
    if (!isMod) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      const pendingMessages = messages.filter(msg => !msg.approved && !msg.denied)
      
      if (event.key === 'a' && event.ctrlKey && pendingMessages.length > 0) {
        // Ctrl+A: Approve first pending message
        event.preventDefault()
        handleModeration(pendingMessages[0].id, 'approve')
      } else if (event.key === 'd' && event.ctrlKey && pendingMessages.length > 0) {
        // Ctrl+D: Deny first pending message
        event.preventDefault()
        handleModeration(pendingMessages[0].id, 'deny')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isMod, messages])

  // Handle banner creation
  const handleCreateBanner = async (title: string, link: string, bannerType: string, durationMinutes: number, messageText?: string) => {
    console.log('Creating banner:', { title, link, bannerType, durationMinutes, messageText })
    
    if (!profile) {
      alert('⛔ You must be logged in to create banners.')
      return
    }

    try {
      // Format the link URL - add https:// if not present
      let formattedLink = link || ''
      if (formattedLink && bannerType !== 'message') {
        if (!formattedLink.startsWith('http://') && !formattedLink.startsWith('https://')) {
          formattedLink = 'https://' + formattedLink
        }
      }
      
      // Map new banner structure to existing database schema
      const legacyBannerData = {
        message: title,
        link_url: formattedLink,
        link_type: bannerType === 'message' ? 'share' : bannerType === 'form' ? 'form' : 'external',
        share_message: messageText || '',
        expires_at: new Date(Date.now() + durationMinutes * 60 * 1000).toISOString(), // Duration in minutes
        active: true,
        created_by: profile.id,
        event_id: activeEvent?.id || null
      }
      
      console.log('Inserting legacy banner data:', legacyBannerData)
      
      const { data, error } = await supabase.from('chat_banners').insert(legacyBannerData)
      
      if (error) {
        console.error('Supabase error:', error)
        alert('Error creating banner: ' + error.message)
        return
      }
      
      console.log('Banner created successfully:', data)
      setShowBannerModal(false)
      
      // Banner will be updated via real-time subscription
    } catch (error) {
      console.error('Error creating banner:', error)
      alert('Error creating banner: ' + String(error))
    }
  }

  // Handle banner clearing
  const handleClearBanner = async () => {
    if (!profile) {
      alert('⛔ You must be logged in to clear banners.')
      return
    }

    try {
      // Deactivate all active banners
      const { error } = await supabase
        .from('chat_banners')
        .update({ active: false })
        .eq('active', true)

      if (error) {
        console.error('Error clearing banner:', error)
        alert('Error clearing banner: ' + error.message)
        return
      }

      console.log('Banner cleared successfully')
      // Save the banner data before clearing it for potential redo
      setLastBanner(lastBanner)
      setShowBannerModal(false)

      // Banner will be updated via real-time subscription
    } catch (error) {
      console.error('Error clearing banner:', error)
      alert('Error clearing banner: ' + String(error))
    }
  }





  // Poll creation and management is now handled by PollCreator component

  // Handle closing poll modal
  const handleClosePollModal = () => {
    setShowPollModal(false)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div 
      className="h-screen flex flex-col fixed inset-0"
      style={{
        backgroundColor: '#0f0f0f'
      }}
    >
      {/* Logo at top right */}
      <div className="absolute top-0 right-4 z-30">
        <Image
          src="/LogoHalfFix.png"
          alt="YAP Logo"
          width={80}
          height={80}
          priority
        />
      </div>

      {/* Fixed Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-black/20 backdrop-blur-sm z-10 flex-shrink-0 fixed top-0 left-0 right-0">
        <div className="flex items-center space-x-2">
          <HamburgerMenu profile={profile} isMod={isMod} />

        </div>
        {isMod && (
          <div className="flex items-center space-x-2 mr-20">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const newValue = !reactionsEnabled
                await supabase
                  .from('flags')
                  .update({ value: newValue })
                  .eq('key', 'reactions_enabled')
                setReactionsEnabled(newValue)
                
                // Note: Emoji toggle broadcasts removed as we're using event-specific channels
              }}
              className={`h-8 w-8 p-0 ${reactionsEnabled ? 'text-yellow-400' : 'text-gray-400'} hover:text-yellow-300 transition-colors`}
              title={reactionsEnabled ? 'Disable Reactions' : 'Enable Reactions'}
            >
              <Smile className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const newValue = !chatFrozen
                await supabase
                  .from('flags')
                  .update({ value: newValue })
                  .eq('key', 'chat_frozen')
                setChatFrozen(newValue)
                
                // Note: Chat freeze broadcasts removed as we're using event-specific channels
              }}
              className={`h-8 w-8 p-0 ${chatFrozen ? 'text-red-400' : 'text-gray-400'} hover:text-red-300 transition-colors`}
              title={chatFrozen ? 'Unfreeze Chat' : 'Freeze Chat'}
            >
              <OctagonX className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBannerModal(true)}
              className="h-8 w-8 p-0 text-gray-400 hover:text-yellow-400 transition-colors"
              title="Create Banner"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPollCreationModal(true)}
              className="h-8 w-8 p-0 text-gray-400 hover:text-yellow-400 transition-colors"
              title="Create Poll"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      


      {/* Floating emojis */}
      <div className="absolute inset-0 pointer-events-none z-50">
        {floatingEmojis.map((emojiObj) => (
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



      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-hidden mt-16 mb-14">
        <ScrollArea className="h-full px-6 py-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {/* No Active Event Message */}
            {!activeEvent && (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">⛔</span>
                    <span className="font-semibold text-yellow-800">No Active Event</span>
                  </div>
                  <p className="text-yellow-700 text-sm">
                    There is no active event right now. Come back during the next service.
                  </p>
                </CardContent>
              </Card>
            )}

            {messages
              .filter((msg) => {
                // Moderators see all non-denied messages (including pending ones)
                if (isMod) {
                  return !msg.denied
                }
                // Regular users see only approved messages or their own messages
                return msg.denied ? false : (msg.approved || msg.user_id === profile?.id)
              })
              .sort((a, b) => {
                if (a.pinned && !b.pinned) return 1
                if (!a.pinned && b.pinned) return -1
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              })
              .map((msg) => {
                // Fallback: load profiles if they're missing
                if (Object.keys(profileMap).length === 0) {
                  refreshProfiles()
                }
                
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
                    profileIcon={(() => {
                      const finalIcon = user.profile_icon || 'Dog'
                      if (process.env.NODE_ENV === 'development') {
                        console.log('Message profileIcon:', { 
                          userId: user.id, 
                          username: user.username,
                          profileIcon: user.profile_icon, 
                          finalIcon: finalIcon,
                          userObject: user
                        })
                      }
                      return finalIcon
                    })()}
                    createdAt={msg.created_at}
                    approved={msg.approved}
                    denied={msg.denied}
                    starred={msg.starred}
                    pinned={msg.pinned}
                    isMod={isMod}
                    upvoteCount={messageUpvotes[msg.id] || 0}
                    userHasUpvoted={userUpvotes[msg.id] || false}
                    hasActiveEvent={!!activeEvent}
                    isOwnMessage={msg.user_id === profile?.id}
                    onModeration={handleModeration}
                    onUpvote={handleUpvote}
                  />
                )
              })}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        

      </div>

      {/* Reactions Enabled Notification */}
      {showReactionsNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          {/* Center point is the smiley face, text floats below but animates together */}
          <div 
            className={`relative ${
              showReactionsNotification 
                ? 'animate-reactionNotification' 
                : 'opacity-0 scale-0'
            }`}
          >
            <div className="bg-background/95 backdrop-blur-sm border-2 border-blue-500 rounded-full p-8 shadow-2xl">
              <Smile className="h-16 w-16 text-blue-500" />
            </div>
            {/* Text positioned absolutely so it doesn't affect centering but animates with parent */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 bg-background/95 backdrop-blur-sm border border-border rounded-full px-6 py-2 shadow-lg">
              <p className="text-lg font-semibold text-blue-500 whitespace-nowrap">Reactions On</p>
            </div>
          </div>
        </div>
      )}



      {/* Poll Trigger - Shows vote button when active poll exists */}
      {activeEvent && profile && (
        <ErrorBoundary>
          <PollTrigger
            eventId={activeEvent.id}
            onPollClick={() => {
              if (!profile?.verified) {
                showVerificationModal('poll voting')
              } else {
                setShowPollModal(true)
              }
            }}
          />
        </ErrorBoundary>
      )}

      {/* Emoji Reactions Toggle Button */}
      {showEmojiButton && (
        <div 
          className={`fixed right-4 z-20 ${
            buttonBurstingAway ? 'animate-burstAway' : 'animate-fadeIn'
          }`} 
          style={{ bottom: '108px' }}
        >
          <button
            ref={emojiToggleRef}
            onClick={() => setShowEmojiBar(!showEmojiBar)}
            className={`w-12 h-12 rounded-full border-2 border-border shadow-lg transition-all duration-300 flex items-center justify-center ${
              showEmojiBar 
                ? 'bg-blue-500 text-white border-blue-500 scale-110' 
                : 'bg-background/90 backdrop-blur-sm hover:scale-105'
            }`}
          >
            <Smile className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Collapsible Emoji Reactions Bar */}
      {reactionsEnabled && activeEvent && profile && (
        <div 
          ref={emojiBarRef}
          className={`fixed right-4 z-20 transition-all duration-300 ease-out origin-bottom-right ${
            showEmojiBar 
              ? 'bottom-24 opacity-100 scale-100 translate-y-0' 
              : 'bottom-16 opacity-0 scale-75 translate-y-4 pointer-events-none'
          }`}
          style={{ 
            transform: showEmojiBar 
              ? 'translateX(-50px) translateY(-60px) scale(1)' 
              : 'translateX(-50px) translateY(-40px) scale(0.75)'
          }}
        >
          <div className="bg-background/95 backdrop-blur-sm border border-border rounded-full px-4 py-2 shadow-xl">
            <div className="flex gap-3">
              {['🔥', '❤️', '👏', '🙌', '😮'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  className="text-2xl hover:scale-125 transition-transform duration-200 p-1"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Poll Modal */}
      {showPollModal && activePoll && (
        <ErrorBoundary>
          <PollModal
            poll={activePoll}
            userId={profile?.id || ''}
            onClose={handleClosePollModal}
          />
        </ErrorBoundary>
      )}

      {/* Floating Banner above message input */}
      <div className="fixed bottom-28 left-1/2 transform -translate-x-1/2 w-1/2 max-w-md z-20">
        <ChatBanner />
      </div>



      {/* Fixed Message Input */}
      <div className="flex-shrink-0 bg-background border-t border-border p-2 pb-8 fixed bottom-0 left-0 right-0 z-10">

        
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              className="flex-1 resize-none rounded-full border-0 bg-muted/30 py-2 pr-4"
              style={{ minHeight: '40px', maxHeight: '40px' }}
              placeholder=""
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              disabled={!activeEvent}
            />
            {/* Custom placeholder with Gotham Ultra font */}
            {!newMessage && (
              <div className={`${gothamUltra.className} absolute inset-0 flex items-center px-3 pointer-events-none text-muted-foreground/60`}>
                {activeEvent ? "Type a message..." : "No active event - messaging disabled"}
              </div>
            )}
          </div>
          <button
            onClick={handleSend}
            className={`p-2 transition-all duration-500 ${
              chatFrozen 
                ? 'text-red-500 cursor-not-allowed' 
                : 'text-foreground hover:text-blue-500 hover:scale-110'
            }`}
            disabled={!activeEvent || chatFrozen}
          >
            {chatFrozen ? (
              <OctagonX className="h-6 w-6" />
            ) : (
              <Send className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>



      {/* Banner Creation Modal */}
      {showBannerModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowBannerModal(false)}
        >
          <div 
            className="bg-background border border-border rounded-lg p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Create Banner</h2>
            </div>
            <BannerForm 
              onSubmit={handleCreateBanner}
              onCancel={() => setShowBannerModal(false)}
            />
          </div>
        </div>
      )}

      {/* Poll Creation Modal */}
      {showPollCreationModal && activeEvent && profile && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowPollCreationModal(false)}
        >
          <div 
            className="bg-background/95 backdrop-blur-sm border border-border rounded-xl p-6 w-full max-w-2xl mx-4 shadow-2xl animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
              </div>
            </div>
            <ErrorBoundary>
              <PollCreator
                eventId={activeEvent.id}
                hasActivePoll={!!activePoll}
                onPollCreated={() => {
                  setShowPollCreationModal(false)
                  fetchPolls()
                }}
                onEndPoll={async () => {
                  try {
                    const { deactivatePoll } = await import('@/lib/polls/api')
                    await deactivatePoll(activePoll!.id)
                    setShowPollCreationModal(false)
                  } catch (error) {
                    console.error('Error deactivating poll:', error)
                    alert('Error deactivating poll: ' + String(error))
                  }
                }}
              />
            </ErrorBoundary>
          </div>
        </div>
      )}

      {/* Verification Prompt */}
      <VerificationPrompt
        isOpen={showVerificationPrompt}
        onClose={() => setShowVerificationPrompt(false)}
        onVerify={() => {
          setShowVerificationPrompt(false)
          window.location.href = '/profile'
        }}
        featureName={verificationFeature}
      />
      
      {/* Verification Required Modal */}
      <VerificationRequiredModal
        isOpen={isVerificationModalOpen}
        onClose={hideVerificationModal}
        featureName={featureName}
      />
    </div>
  )
}
