'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PollForm from './PollForm'
import { createPoll, createTimedPoll, getQueuedPolls } from '@/lib/polls/api'
import { endCurrentAndStartNext } from '@/lib/polls/transitions'
import { supabase } from '@/lib/supabaseClient'
import { gothamMedium, gothamUltra } from '@/lib/fonts'

interface PollCreatorProps {
  eventId: string
  onPollCreated?: () => void
  hasActivePoll?: boolean
  onEndPoll?: () => void
}

export default function PollCreator({ eventId, onPollCreated, hasActivePoll, onEndPoll }: PollCreatorProps) {
  const [showForm, setShowForm] = useState(true) // Show form immediately
  const [isCreating, setIsCreating] = useState(false)
  const [queuedCount, setQueuedCount] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Load queued polls count
  const loadQueuedCount = async () => {
    try {
      const queued = await getQueuedPolls(eventId)
      setQueuedCount(queued.length)
    } catch (error) {
      console.error('Error loading queued polls:', error)
    }
  }

  // Handle manual transition to next poll
  const handleStartNext = async () => {
    if (!eventId) return
    
    setIsTransitioning(true)
    try {
      const success = await endCurrentAndStartNext(eventId)
      if (success) {
        onPollCreated?.()
        await loadQueuedCount()
      } else {
        alert('No queued polls to start')
      }
    } catch (error) {
      console.error('Error starting next poll:', error)
      alert('Failed to start next poll')
    } finally {
      setIsTransitioning(false)
    }
  }

  const handleSubmit = async (question: string, options: string[], correctOptionIndex: number, durationSeconds: number, autoStart: boolean) => {
    if (!eventId) {
      alert('Event information is required to create polls.')
      return
    }

    setIsCreating(true)
    try {
      // Determine poll type based on options
      const pollType = options.length === 2 && options[0] === 'Yes' && options[1] === 'No' 
        ? 'yes_no' as const 
        : 'multi' as const
      
      // Get current user ID from Supabase auth
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id
      
      const pollId = await createTimedPoll(question, pollType, options, correctOptionIndex, durationSeconds, eventId, autoStart, userId)
      
      if (pollId) {
        setShowForm(false)
        onPollCreated?.()
        await loadQueuedCount()
        // Reset form
        setShowForm(false)
      } else {
        alert('Failed to create poll. Please try again.')
      }
    } catch (error) {
      console.error('Error creating poll:', error)
      alert('Error creating poll: ' + String(error))
    } finally {
      setIsCreating(false)
    }
  }

  // Load queue count on mount and when eventId changes
  useEffect(() => {
    if (eventId) {
      loadQueuedCount()
    }
  }, [eventId])

  if (showForm) {
    return (
      <Card className="w-full max-w-2xl mx-auto border border-gray-700 bg-gray-900 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className={`${gothamMedium.className} text-xl text-white`}>Create Live Poll</CardTitle>
            </div>
            <div className="flex gap-2">
              {queuedCount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleStartNext}
                  disabled={isTransitioning}
                  className={`${gothamMedium.className} hover:scale-105 transition-transform duration-200`}
                >
                  {isTransitioning ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                      Starting...
                    </>
                  ) : (
                    `Start Next (${queuedCount} queued)`
                  )}
                </Button>
              )}
              {hasActivePoll && onEndPoll && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={onEndPoll}
                  className={`${gothamUltra.className} hover:scale-105 transition-transform duration-200`}
                >
                  End Poll
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PollForm 
            onSubmit={handleSubmit} 
            isSubmitting={isCreating}
          />
        </CardContent>
      </Card>
    )
  }

  return null
}
