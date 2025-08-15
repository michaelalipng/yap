'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Poll, PollOption, PollResult, getActivePoll, getPollOptions, getPollResultsWithOptions, subscribePollVotes, checkPollExpiry } from '@/lib/polls/api'
import { usePollTransitions } from '@/lib/polls/transitions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Users, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { gothamMedium, gothamUltra, gothamBook } from '@/lib/fonts'
import Image from 'next/image'
import Link from 'next/link'
import PollTimer from '@/components/PollTimer'

interface Event {
  id: string
  title: string
  description?: string
  starts_at: string
  ends_at: string
  active: boolean
}

export default function PublicPollsPage() {
  const [activeEvent, setActiveEvent] = useState<Event | null>(null)
  const [activePoll, setActivePoll] = useState<Poll | null>(null)
  const [pollOptions, setPollOptions] = useState<PollOption[]>([])
  const [pollResults, setPollResults] = useState<PollResult[]>([])
  const [hasVoted, setHasVoted] = useState(false)
  const [userVote, setUserVote] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)
  const [pollEnded, setPollEnded] = useState(false)
  const [sessionId] = useState(() => {
    // Generate a unique session ID for anonymous voting
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  })

  // Handle poll expiry
  const handlePollExpiry = useCallback(async () => {
    if (activeEvent) {
      await checkPollExpiry(activeEvent.id)
      setPollEnded(true)
      // Refresh the poll data after expiry
      setTimeout(() => {
        loadActiveContent()
      }, 2000) // Give a bit more time for transitions
    }
  }, [activeEvent])

  // Handle poll transitions
  const handlePollTransition = useCallback(() => {
    console.log('Poll transition detected, refreshing data...')
    if (activeEvent) {
      // Reset poll ended state for new polls
      setPollEnded(false)
      // Refresh poll data
      loadActiveContent()
    }
  }, [activeEvent])

  // Set up auto-transitions
  const { startMonitoring, stopMonitoring } = usePollTransitions(
    activeEvent?.id || null, 
    handlePollTransition
  )

  // Load active event and poll
  const loadActiveContent = useCallback(async () => {
    try {
      setLoading(true)

      // Get active event
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('active', true)
        .single()

      setActiveEvent(eventData)

      if (eventData) {
        // Get active poll for this event
        const poll = await getActivePoll(eventData.id)
        setActivePoll(poll)

        if (poll) {
          // Get poll options
          const options = await getPollOptions(poll.id)
          setPollOptions(options)

          // Get poll results
          const results = await getPollResultsWithOptions(poll.id, options)
          setPollResults(results)

          // Check if this session has already voted
          const { data: existingVote } = await supabase
            .from('poll_votes')
            .select('option_id')
            .eq('poll_id', poll.id)
            .eq('user_id', sessionId)
            .single()

          if (existingVote) {
            setHasVoted(true)
            setUserVote(existingVote.option_id)
          }
        }
      }
    } catch (error) {
      console.error('Error loading active content:', error)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  // Handle voting
  const handleVote = async (optionId: string) => {
    if (!activePoll || voting || hasVoted) return

    try {
      setVoting(true)

      // Cast vote using API route
      const response = await fetch('/api/polls/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pollId: activePoll.id,
          optionId: optionId,
          sessionId: sessionId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Error casting vote:', error)
        return
      }

      // Update local state
      setHasVoted(true)
      setUserVote(optionId)

      // Refresh results immediately
      const results = await getPollResultsWithOptions(activePoll.id, pollOptions)
      setPollResults(results)

    } catch (error) {
      console.error('Error voting:', error)
    } finally {
      setVoting(false)
    }
  }

  // Subscribe to real-time poll updates
  useEffect(() => {
    if (!activePoll) return

    const unsubscribe = subscribePollVotes(activePoll.id, async () => {
      // Refresh results when votes change
      const results = await getPollResultsWithOptions(activePoll.id, pollOptions)
      setPollResults(results)
    })

    return unsubscribe
  }, [activePoll, pollOptions])

  // Load content on mount
  useEffect(() => {
    loadActiveContent()
  }, [loadActiveContent])

  // Start/stop poll transition monitoring
  useEffect(() => {
    if (activeEvent) {
      startMonitoring()
      return () => {
        stopMonitoring()
      }
    }
  }, [activeEvent, startMonitoring, stopMonitoring])

  // Subscribe to event changes
  useEffect(() => {
    const channel = supabase
      .channel('public-events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        (payload) => {
          console.log('Event change detected:', payload)
          // Reload when events change
          loadActiveContent()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Subscribe to poll changes for the active event
  useEffect(() => {
    if (!activeEvent) return

    console.log('Setting up poll subscription for event:', activeEvent.id)
    
    const channel = supabase
      .channel(`polls-${activeEvent.id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'polls',
          filter: `event_id=eq.${activeEvent.id}`
        },
        (payload) => {
          console.log('Poll change detected for event:', activeEvent.id, payload)
          // Reset voting states for new polls
          setHasVoted(false)
          setUserVote(null)
          setPollEnded(false)
          // Reload content to get the new/updated poll
          setTimeout(() => {
            loadActiveContent()
          }, 500) // Small delay to ensure DB is consistent
        }
      )
      .subscribe()

    return () => {
      console.log('Cleaning up poll subscription for event:', activeEvent.id)
      supabase.removeChannel(channel)
    }
  }, [activeEvent, loadActiveContent])

  // Subscribe to poll options changes
  useEffect(() => {
    if (!activePoll) return

    console.log('Setting up poll options subscription for poll:', activePoll.id)
    
    const channel = supabase
      .channel(`poll-options-${activePoll.id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'poll_options',
          filter: `poll_id=eq.${activePoll.id}`
        },
        (payload) => {
          console.log('Poll options change detected for poll:', activePoll.id, payload)
          // Reload content to get updated options
          setTimeout(() => {
            loadActiveContent()
          }, 200)
        }
      )
      .subscribe()

    return () => {
      console.log('Cleaning up poll options subscription for poll:', activePoll.id)
      supabase.removeChannel(channel)
    }
  }, [activePoll, loadActiveContent])

  const getTotalVotes = () => {
    return pollResults.reduce((sum, result) => sum + result.vote_count, 0)
  }

  const getEventStatus = () => {
    if (!activeEvent) return 'No Event'
    
    const now = new Date()
    const startTime = new Date(activeEvent.starts_at)
    const endTime = new Date(activeEvent.ends_at)
    
    if (now < startTime) return 'Upcoming'
    if (now > endTime) return 'Ended'
    return 'Live'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-md border">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading polls...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen pt-1 px-4 pb-4 sm:pt-1 sm:px-6 sm:pb-6 bg-gradient-to-br from-blue-50 to-indigo-100"
    >
      {/* Header with Logo and Live Indicator */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between py-0">
          {/* Logo */}
          <div>
            <Link 
              href="https://www.healingplacechurch.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block hover:opacity-80 transition-opacity duration-200"
            >
              <Image
                src="/HPClogo.png"
                alt="Healing Place Church Logo"
                width={160}
                height={160}
                className="w-32 h-32 sm:w-40 sm:h-40 object-contain"
              />
            </Link>
          </div>

          {/* Live Indicator */}
          {activeEvent && (
            <div className={`${gothamMedium.className} flex items-center gap-2 text-sm`}>
              {getEventStatus() === 'Live' && (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-600 font-semibold">Live</span>
                </>
              )}
              {getEventStatus() === 'Upcoming' && (
                <>
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  <span className="text-amber-600 font-semibold">Upcoming</span>
                </>
              )}
              {getEventStatus() === 'Ended' && (
                <>
                  <div className="w-2 h-2 bg-gray-400 rounded-full" />
                  <span className="text-gray-600 font-semibold">Ended</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Welcome Text */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="text-center">
          <h1 className={`${gothamUltra.className} text-gray-900 leading-tight`}>
            <div className="text-8xl sm:text-9xl md:text-[12rem] lg:text-[16rem] xl:text-[20rem]">Christmas at Healing Place Church</div>
          </h1>

        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto">

        {/* Poll Content */}
        {!activeEvent ? (
          <Card className="bg-white border-0 rounded-2xl shadow-md">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h2 className={`${gothamMedium.className} text-xl text-gray-900 mb-2`}>
                No Active Event
              </h2>
              <p className="text-gray-600">
                There are currently no active events with polls. Check back during a live event!
              </p>
            </CardContent>
          </Card>
        ) : !activePoll ? (
          <Card className="bg-white border-0 rounded-2xl shadow-md">
            <CardContent className="p-8 text-center">
              <BarChart3 className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h2 className={`${gothamMedium.className} text-xl text-gray-900 mb-2`}>
                No Active Poll
              </h2>
              <p className="text-gray-600">
                No polls are currently active for this event. Stay tuned!
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white border-0 rounded-2xl shadow-md">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className={`${gothamMedium.className} text-gray-900 text-xl`}>
                  {activePoll.question}
                </CardTitle>
                <div className="flex items-center gap-3">
                  {activePoll.ends_at && (
                    <PollTimer 
                      endsAt={activePoll.ends_at} 
                      onExpire={handlePollExpiry}
                    />
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                    <Users className="h-4 w-4" />
                    {getTotalVotes()} votes
                  </div>
                </div>
              </div>
              
              {/* Show poll status */}
              {pollEnded && activePoll.correct_option_id && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 text-blue-800">
                    <CheckCircle className="h-5 w-5" />
                    <span className={`${gothamMedium.className} font-semibold`}>
                      Poll Ended - Correct Answer: {
                        pollOptions.find(opt => opt.id === activePoll.correct_option_id)?.label || 'Unknown'
                      }
                    </span>
                  </div>
                </div>
              )}
            </CardHeader>
            
            <CardContent>
              {hasVoted ? (
                // Show results after voting
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600 mb-6 bg-green-50 p-3 rounded-xl border border-green-200">
                    <CheckCircle className="h-5 w-5" />
                    <span className={`${gothamMedium.className} text-sm`}>
                      Thanks for voting!
                    </span>
                  </div>
                  
                  {pollResults.map((result) => {
                    const isCorrectAnswer = activePoll?.correct_option_id === result.option_id
                    const isUserVote = userVote === result.option_id
                    
                    return (
                      <div key={result.option_id} className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className={`${gothamBook.className} ${
                            isCorrectAnswer && pollEnded 
                              ? 'text-green-700 font-bold' 
                              : 'text-gray-900'
                          } ${isUserVote ? 'font-semibold' : ''}`}>
                            {result.option_text}
                            {isUserVote && (
                              <span className="text-blue-600 ml-2">👤</span>
                            )}
                            {isCorrectAnswer && pollEnded && (
                              <span className="text-green-600 ml-2">✅</span>
                            )}
                          </span>
                          <span className="text-sm text-gray-600 font-medium bg-gray-100 px-2 py-1 rounded-full">
                            {result.vote_count} ({result.percentage}%)
                          </span>
                        </div>
                        <Progress 
                          value={result.percentage} 
                          className={`h-4 ${
                            isCorrectAnswer && pollEnded 
                              ? '[&>div]:bg-green-500' 
                              : ''
                          }`}
                        />
                      </div>
                    )
                  })}
                </div>
              ) : (
                // Show voting options
                <div className="space-y-4">
                  <p className="text-gray-600 text-sm mb-6 font-medium">
                    Select your answer:
                  </p>
                  
                  {pollOptions.map((option) => (
                    <Button
                      key={option.id}
                      onClick={() => handleVote(option.id)}
                      disabled={voting}
                      className={`${gothamBook.className} w-full justify-start text-left p-4 h-auto bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 text-gray-900 transition-all duration-200 shadow-md rounded-xl`}
                    >
                      {voting ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          <span className="text-blue-600">Voting...</span>
                        </div>
                      ) : (
                        <span className="font-medium">{option.label}</span>
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}



      </div>

        {/* Connect Card */}
        <div className="mt-48 mb-8">
          <a 
            href="https://healingplacechurch.org/connect"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white rounded-2xl shadow-md hover:shadow-lg hover:scale-102 transition-all duration-200 p-8 text-center"
          >
            <div className="space-y-2">
              <div className={`${gothamBook.className} text-lg text-gray-600`}>
                Get Connected to
              </div>
              <div className={`${gothamUltra.className} text-5xl font-bold text-gray-900`}>
                Healing Place Church
              </div>
            </div>
          </a>
        </div>

    </div>
  )
}
