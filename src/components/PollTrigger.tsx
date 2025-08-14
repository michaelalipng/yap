'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { BarChart3 } from 'lucide-react'
import { useRealtimePolls } from './RealtimePollProvider'

interface PollTriggerProps {
  eventId: string
  onPollClick: () => void
}

export default function PollTrigger({ eventId, onPollClick }: PollTriggerProps) {
  const { activePolls, subscribeToPoll, refreshPoll } = useRealtimePolls()
  const activePoll = activePolls[eventId]

  // Debug logging
  useEffect(() => {
    console.log('PollTrigger: Event ID:', eventId)
    console.log('PollTrigger: Active polls:', activePolls)
    console.log('PollTrigger: Active poll for this event:', activePoll)
    
    if (activePoll) {
      console.log('PollTrigger: Poll details:', {
        id: activePoll.id,
        question: activePoll.question,
        type: activePoll.type,
        active: activePoll.active,
        event_id: activePoll.event_id
      })
    } else {
      console.log('PollTrigger: No active poll found for event:', eventId)
    }
  }, [eventId, activePolls, activePoll])

  // Main effect for subscription and initial setup
  useEffect(() => {
    if (!eventId) {
      console.warn('PollTrigger: Missing eventId')
      return
    }

    console.log('PollTrigger: Setting up subscription for event:', eventId)
    
    // Subscribe to real-time poll updates for this event
    const unsubscribe = subscribeToPoll(eventId)
    
    // Also do an immediate refresh to ensure we have the latest data
    console.log('PollTrigger: Doing immediate poll refresh for event:', eventId)
    refreshPoll(eventId)
    
    // Set up periodic poll check as fallback (only if no active poll)
    let interval: NodeJS.Timeout | null = null
    if (!activePoll) {
      console.log('PollTrigger: Setting up periodic poll check for event:', eventId)
      interval = setInterval(() => {
        console.log('PollTrigger: Periodic poll check for event:', eventId)
        refreshPoll(eventId)
      }, 5000) // Check every 5 seconds
    }
    
    return () => {
      console.log('PollTrigger: Cleaning up subscription for event:', eventId)
      unsubscribe()
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [eventId, subscribeToPoll, refreshPoll, activePoll])

  if (!activePoll) {
    console.log('PollTrigger: No active poll, not rendering button')
    return null
  }

  console.log('PollTrigger: Rendering poll button for poll:', activePoll.id)
  
  return (
    <div className="fixed right-4 z-20" style={{ bottom: '180px' }}>
      <Button
        onClick={onPollClick}
        className="w-12 h-12 rounded-full border-2 border-green-500 shadow-lg transition-all duration-300 hover:scale-105 bg-background/90 backdrop-blur-sm hover:bg-green-50 hover:border-green-500"
        title="Vote in Poll"
      >
        <BarChart3 className="h-6 w-6 text-green-600" />
      </Button>
    </div>
  )
}
