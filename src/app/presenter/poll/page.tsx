'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { isAuthorized } from '../_lib/token'
import { getActivePoll, getPollOptions, getPollResults, subscribePollVotes, subscribeActivePoll } from '@/lib/polls/api'
import type { Poll, PollOption, PollResult } from '@/lib/polls/api'
import { monsieGraffiti, dotemp, gothamMedium } from '@/lib/fonts'
import Image from 'next/image'

interface AnimatedResult extends PollResult {
  animatedPercentage: number
  targetPercentage: number
}

interface ActiveEvent {
  id: string
  title: string
}

export default function PollPresenterPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null)
  const [activePoll, setActivePoll] = useState<Poll | null>(null)
  const [_pollOptions, setPollOptions] = useState<PollOption[]>([])
  const [pollResults, setPollResults] = useState<AnimatedResult[]>([])
  const [_totalVotes, setTotalVotes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [_animateResults, setAnimateResults] = useState(false)
  const voteSubscriptionRef = useRef<(() => void) | null>(null)
  const pollSubscriptionRef = useRef<(() => void) | null>(null)
  
  // Fetch active event
  useEffect(() => {
    const fetchActiveEvent = async () => {
      try {
        console.log('Poll monitor: Fetching active event...')
        
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

  // Fetch active poll when event changes
  useEffect(() => {
    if (!activeEvent) return

    const fetchActivePoll = async () => {
      try {
        console.log('Fetching active poll for event:', activeEvent.id)
        const poll = await getActivePoll(activeEvent.id)
        
        if (poll) {
          console.log('Found active poll:', poll)
          setActivePoll(poll)
          
          // Fetch poll options
          const options = await getPollOptions(poll.id)
          setPollOptions(options)
          
          // Fetch initial results
          await refreshResults(poll.id)
        } else {
          console.log('No active poll found')
          setActivePoll(null)
          setPollOptions([])
          setPollResults([])
          setTotalVotes(0)
        }
        setLoading(false)
      } catch (error) {
        console.error('Error fetching active poll:', error)
        setLoading(false)
      }
    }

    fetchActivePoll()
  }, [activeEvent])

  // Subscribe to poll changes (activation/deactivation) - only depends on activeEvent
  useEffect(() => {
    if (!activeEvent) return

    const subscribeToPollChanges = async () => {
      try {
        const pollCleanup = await subscribeActivePoll(activeEvent.id, async (poll: Poll | null) => {
          console.log('Poll change detected:', poll)
          if (poll) {
            setActivePoll(poll)
            // Fetch poll options
            const options = await getPollOptions(poll.id)
            setPollOptions(options)
            // Refresh results
            await refreshResults(poll.id)
          } else {
            setActivePoll(null)
            setPollOptions([])
            setPollResults([])
            setTotalVotes(0)
          }
        })
        
        pollSubscriptionRef.current = pollCleanup
      } catch (error) {
        console.error('Error subscribing to poll changes:', error)
      }
    }

    subscribeToPollChanges()

    return () => {
      if (pollSubscriptionRef.current) {
        pollSubscriptionRef.current()
      }
    }
  }, [activeEvent])

  // Subscribe to vote changes for live results - only depends on activePoll
  useEffect(() => {
    if (!activePoll) return

    const subscribeToVoteChanges = async () => {
      try {
        console.log('Subscribing to vote changes for poll:', activePoll.id)
        const voteCleanup = await subscribePollVotes(activePoll.id, async () => {
          console.log('Vote change detected, refreshing results...')
          await refreshResults(activePoll.id)
        })
        
        voteSubscriptionRef.current = voteCleanup
      } catch (error) {
        console.error('Error subscribing to vote changes:', error)
      }
    }

    subscribeToVoteChanges()

    return () => {
      if (voteSubscriptionRef.current) {
        voteSubscriptionRef.current()
      }
    }
  }, [activePoll])

  // Refresh poll results
  const refreshResults = async (pollId: string) => {
    try {
      console.log('Refreshing results for poll:', pollId)
      const results = await getPollResults(pollId)
      const total = results.reduce((sum, result) => sum + result.vote_count, 0)
      
      console.log('New results:', results, 'Total votes:', total)
      
      // Create animated results with current animated values and new target percentages
      const animatedResults = results.map(result => {
        const currentResult = pollResults.find(r => r.option_id === result.option_id)
        return {
          ...result,
          animatedPercentage: currentResult?.animatedPercentage || 0,
          targetPercentage: total > 0 ? (result.vote_count / total) * 100 : 0
        }
      })
      
      setPollResults(animatedResults)
      setTotalVotes(total)
      
      // Smoothly animate to new percentages
      setTimeout(() => {
        animatedResults.forEach((result, index) => {
          setTimeout(() => {
            setPollResults(prev => 
              prev.map((r, i) => 
                i === index ? { ...r, animatedPercentage: r.targetPercentage } : r
              )
            )
          }, index * 100) // Faster animation for live updates
        })
      }, 50)
    } catch (error) {
      console.error('Error refreshing results:', error)
    }
  }

  // Cleanup subscriptions
  useEffect(() => {
    return () => {
      if (voteSubscriptionRef.current) {
        voteSubscriptionRef.current()
      }
      if (pollSubscriptionRef.current) {
        pollSubscriptionRef.current()
      }
    }
  }, [])

  // Simple authorization check - moved here after all hooks
  if (!token) {
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
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Access Denied</h1>
          <p className="text-xl">Invalid token</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold">Loading Poll Monitor...</h1>
        </div>
      </div>
    )
  }

  if (!activeEvent) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">No Active Event</h1>
          <p className="text-xl text-gray-400">There is currently no active event running</p>
        </div>
      </div>
    )
  }

  if (!activePoll) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">No Active Poll</h1>
          <p className="text-xl text-gray-400 mb-8">Event: {activeEvent.title}</p>
          <p className="text-lg text-gray-500">Waiting for a poll to be created...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 relative">
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

      {/* Question */}
      <div className="text-center mb-16 mt-20">
        <h1 className={`${dotemp.className} text-6xl font-bold leading-tight max-w-6xl mx-auto text-yellow-400`}>
          {activePoll.question}
        </h1>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto space-y-8">
        {pollResults.map((result) => (
          <div key={result.option_id} className="space-y-3">
            {/* Option Label and Count */}
            <div className="flex justify-between items-center">
              <span className={`${gothamMedium.className} text-2xl font-semibold`}>{result.option_text}</span>
              <div className="text-right">
                <div className={`${gothamMedium.className} text-3xl font-bold`}>{result.vote_count}</div>
                <div className="text-lg text-gray-400">votes</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="relative h-16 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-yellow-400 rounded-full transition-all duration-1000 ease-out"
                style={{ 
                  width: `${result.animatedPercentage}%`,
                  transition: 'width 1s ease-out'
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`${gothamMedium.className} text-xl font-bold text-white drop-shadow-lg`}>
                  {Math.round(result.animatedPercentage)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Smile Image */}
      <div className="absolute bottom-8 right-8">
        <Image
          src="/Smile.png"
          alt="Smile"
          width={80}
          height={80}
          priority
        />
      </div>

    </div>
  )
}
