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
  const { activePolls, subscribeToPoll } = useRealtimePolls()
  const activePoll = activePolls[eventId]

  // Debug logging
  useEffect(() => {
    console.log('PollTrigger: Event ID:', eventId)
    console.log('PollTrigger: Active polls:', activePolls)
    console.log('PollTrigger: Active poll for this event:', activePoll)
  }, [eventId, activePolls, activePoll])

  useEffect(() => {
    if (!eventId) {
      console.warn('PollTrigger: Missing eventId')
      return
    }

    // Subscribe to real-time poll updates for this event
    const unsubscribe = subscribeToPoll(eventId)
    
    return () => {
      unsubscribe()
    }
  }, [eventId, subscribeToPoll])

  if (!activePoll) {
    return null
  }

  return (
    <div className="fixed right-4 z-20" style={{ bottom: '172px' }}>
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
