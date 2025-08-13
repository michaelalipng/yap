'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Poll, getActivePoll } from '@/lib/polls/api'

interface RealtimePollContextType {
  activePolls: { [eventId: string]: Poll | null }
  refreshPoll: (eventId: string) => Promise<void>
  subscribeToPoll: (eventId: string) => (() => void)
}

const RealtimePollContext = createContext<RealtimePollContextType | undefined>(undefined)

export const useRealtimePolls = () => {
  const context = useContext(RealtimePollContext)
  if (!context) {
    throw new Error('useRealtimePolls must be used within a RealtimePollProvider')
  }
  return context
}

interface RealtimePollProviderProps {
  children: ReactNode
}

export function RealtimePollProvider({ children }: RealtimePollProviderProps) {
  const [activePolls, setActivePolls] = useState<{ [eventId: string]: Poll | null }>({})
  const subscriptionsRef = useRef<{ [eventId: string]: (() => void) }>({})
  const isUpdatingRef = useRef(false)

  const refreshPoll = useCallback(async (eventId: string) => {
    if (isUpdatingRef.current) return // Prevent recursive updates
    
    try {
      isUpdatingRef.current = true
      const poll = await getActivePoll(eventId)
      setActivePolls(prev => ({
        ...prev,
        [eventId]: poll
      }))
    } catch (error) {
      console.error('Error refreshing poll:', error)
    } finally {
      isUpdatingRef.current = false
    }
  }, [])

  const subscribeToPoll = useCallback((eventId: string) => {
    // If already subscribed, return the cleanup function
    if (subscriptionsRef.current[eventId]) {
      return subscriptionsRef.current[eventId]
    }

    console.log(`Setting up real-time subscription for event: ${eventId}`)
    
    // Immediately check for existing active poll when subscribing
    refreshPoll(eventId)
    
    const channel = supabase
      .channel(`realtime-polls:${eventId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'polls',
          filter: `event_id=eq.${eventId}`
        },
        async (payload) => {
          console.log('Real-time poll change detected:', payload)
          
          // Prevent recursive updates
          if (isUpdatingRef.current) return
          
          if (payload.eventType === 'INSERT' && payload.new.active) {
            // New active poll created
            console.log('New active poll detected:', payload.new)
            setActivePolls(prev => ({
              ...prev,
              [eventId]: payload.new as Poll
            }))
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.active) {
              // Poll activated
              console.log('Poll activated:', payload.new)
              setActivePolls(prev => ({
                ...prev,
                [eventId]: payload.new as Poll
              }))
            } else {
              // Poll deactivated
              console.log('Poll deactivated for event:', eventId)
              setActivePolls(prev => ({
                ...prev,
                [eventId]: null
              }))
            }
          } else if (payload.eventType === 'DELETE') {
            // Poll deleted
            console.log('Poll deleted for event:', eventId)
            setActivePolls(prev => ({
              ...prev,
              [eventId]: null
            }))
          }
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'poll_votes',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          console.log('Real-time poll vote change detected:', payload)
          
          // Don't call refreshPoll here to avoid infinite loops
          // Components will handle vote updates through their own subscriptions
        }
      )
      .subscribe((status) => {
        console.log(`Subscription status for event ${eventId}:`, status)
      })

    // Store the subscription and cleanup function
    const cleanup = () => {
      console.log(`Cleaning up subscription for event: ${eventId}`)
      supabase.removeChannel(channel)
      delete subscriptionsRef.current[eventId]
      setActivePolls(prev => {
        const newPolls = { ...prev }
        delete newPolls[eventId]
        return newPolls
      })
    }

    subscriptionsRef.current[eventId] = cleanup

    return cleanup
  }, [refreshPoll])

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      const currentSubscriptions = { ...subscriptionsRef.current }
      Object.values(currentSubscriptions).forEach(cleanup => cleanup())
    }
  }, [])

  const contextValue: RealtimePollContextType = {
    activePolls,
    refreshPoll,
    subscribeToPoll
  }

  return (
    <RealtimePollContext.Provider value={contextValue}>
      {children}
    </RealtimePollContext.Provider>
  )
}
