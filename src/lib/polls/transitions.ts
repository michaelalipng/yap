import { supabase } from '@/lib/supabaseClient'
import { checkPollExpiry, startNextQueuedPoll } from './api'

// Global transition manager
class PollTransitionManager {
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  private subscribers: Map<string, Set<() => void>> = new Map()

  // Start monitoring an event for poll transitions
  startMonitoring(eventId: string) {
    if (this.intervals.has(eventId)) {
      return // Already monitoring
    }

    console.log(`Starting poll transition monitoring for event: ${eventId}`)

    const interval = setInterval(async () => {
      try {
        await this.checkAndTransition(eventId)
      } catch (error) {
        console.error('Error in poll transition check:', error)
      }
    }, 1000) // Check every second

    this.intervals.set(eventId, interval)
  }

  // Stop monitoring an event
  stopMonitoring(eventId: string) {
    const interval = this.intervals.get(eventId)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(eventId)
      console.log(`Stopped poll transition monitoring for event: ${eventId}`)
    }
  }

  // Subscribe to transition events
  subscribe(eventId: string, callback: () => void) {
    if (!this.subscribers.has(eventId)) {
      this.subscribers.set(eventId, new Set())
    }
    this.subscribers.get(eventId)!.add(callback)
  }

  // Unsubscribe from transition events
  unsubscribe(eventId: string, callback: () => void) {
    const subs = this.subscribers.get(eventId)
    if (subs) {
      subs.delete(callback)
      if (subs.size === 0) {
        this.subscribers.delete(eventId)
      }
    }
  }

  // Notify subscribers of transitions
  private notifySubscribers(eventId: string) {
    const subs = this.subscribers.get(eventId)
    if (subs) {
      subs.forEach(callback => {
        try {
          callback()
        } catch (error) {
          console.error('Error in transition subscriber callback:', error)
        }
      })
    }
  }

  // Check for expired polls and handle transitions
  private async checkAndTransition(eventId: string) {
    try {
      // Get current active polls
      const { data: activePolls } = await supabase
        .from('polls')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'active')
        .not('ends_at', 'is', null)

      if (!activePolls || activePolls.length === 0) {
        return
      }

      const now = new Date()
      let transitionOccurred = false

      // Check each active poll for expiry
      for (const poll of activePolls) {
        const endsAt = new Date(poll.ends_at)
        
        if (now >= endsAt) {
          console.log(`Poll ${poll.id} has expired, transitioning...`)
          
          // End the expired poll
          await supabase
            .from('polls')
            .update({ 
              active: false, 
              status: 'ended',
              ends_at: now.toISOString() 
            })
            .eq('id', poll.id)

          transitionOccurred = true

          // Check if there's a queued poll to start
          const { data: queuedPolls } = await supabase
            .from('polls')
            .select('*')
            .eq('event_id', eventId)
            .eq('status', 'draft')
            .eq('auto_start', true)
            .order('queue_position', { ascending: true })
            .limit(1)

          if (queuedPolls && queuedPolls.length > 0) {
            const nextPoll = queuedPolls[0]
            console.log(`Starting next queued poll: ${nextPoll.id}`)

            // Start the next poll
            const startTime = new Date()
            const endTime = new Date(startTime.getTime() + (nextPoll.duration_seconds || 60) * 1000)

            await supabase
              .from('polls')
              .update({
                active: true,
                status: 'active',
                starts_at: startTime.toISOString(),
                ends_at: endTime.toISOString()
              })
              .eq('id', nextPoll.id)

            console.log(`Successfully started poll ${nextPoll.id}`)
          }
        }
      }

      // Notify subscribers if any transition occurred
      if (transitionOccurred) {
        this.notifySubscribers(eventId)
      }

    } catch (error) {
      console.error('Error in checkAndTransition:', error)
    }
  }

  // Manually trigger a transition (for immediate use)
  async triggerTransition(eventId: string) {
    await this.checkAndTransition(eventId)
  }

  // Clean up all intervals (for app shutdown)
  cleanup() {
    this.intervals.forEach((interval) => clearInterval(interval))
    this.intervals.clear()
    this.subscribers.clear()
  }
}

// Global singleton instance
export const pollTransitionManager = new PollTransitionManager()

// Hook for React components to use poll transitions
export const usePollTransitions = (eventId: string | null, onTransition?: () => void) => {
  const startMonitoring = () => {
    if (eventId) {
      pollTransitionManager.startMonitoring(eventId)
      if (onTransition) {
        pollTransitionManager.subscribe(eventId, onTransition)
      }
    }
  }

  const stopMonitoring = () => {
    if (eventId) {
      pollTransitionManager.stopMonitoring(eventId)
      if (onTransition) {
        pollTransitionManager.unsubscribe(eventId, onTransition)
      }
    }
  }

  const triggerTransition = async () => {
    if (eventId) {
      await pollTransitionManager.triggerTransition(eventId)
    }
  }

  return {
    startMonitoring,
    stopMonitoring,
    triggerTransition
  }
}

// Utility function to manually end current poll and start next
export const endCurrentAndStartNext = async (eventId: string): Promise<boolean> => {
  try {
    // End current active poll
    await supabase
      .from('polls')
      .update({ 
        active: false, 
        status: 'ended',
        ends_at: new Date().toISOString()
      })
      .eq('event_id', eventId)
      .eq('status', 'active')

    // Start next queued poll
    return await startNextQueuedPoll(eventId)
  } catch (error) {
    console.error('Error in endCurrentAndStartNext:', error)
    return false
  }
}
