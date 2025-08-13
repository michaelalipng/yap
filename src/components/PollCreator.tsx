'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PollForm from './PollForm'
import { createPoll } from '@/lib/polls/api'
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

  const handleSubmit = async (question: string, options: string[]) => {
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
      
      const pollId = await createPoll(question, pollType, options, eventId, userId)
      
      if (pollId) {
        setShowForm(false)
        onPollCreated?.()
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

  if (showForm) {
    return (
      <Card className="w-full max-w-2xl mx-auto border border-gray-700 bg-gray-900 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className={`${gothamMedium.className} text-xl text-white`}>Create Live Poll</CardTitle>
            </div>
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
