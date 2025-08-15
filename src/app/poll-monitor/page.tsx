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

export default function PollMonitorPage() {
  const [activeEvent, setActiveEvent] = useState<Event | null>(null)
  const [activePoll, setActivePoll] = useState<Poll | null>(null)
  const [pollOptions, setPollOptions] = useState<PollOption[]>([])
  const [pollResults, setPollResults] = useState<PollResult[]>([])
  const [loading, setLoading] = useState(true)
  const [pollEnded, setPollEnded] = useState(false)
  
  // Store ended poll data to show results until new poll starts
  const [endedPoll, setEndedPoll] = useState<Poll | null>(null)
  const [endedPollOptions, setEndedPollOptions] = useState<PollOption[]>([])
  const [endedPollResults, setEndedPollResults] = useState<PollResult[]>([])

  // Handle poll expiry
  const handlePollExpiry = useCallback(async () => {
    if (activeEvent && activePoll) {
      // Store current poll data before it becomes inactive
      setEndedPoll(activePoll)
      setEndedPollOptions(pollOptions)
      setEndedPollResults(pollResults)
      
      await checkPollExpiry(activeEvent.id)
      setPollEnded(true)
      
      // Refresh the poll data after expiry
      setTimeout(() => {
        fetchPolls(activeEvent.id)
      }, 2000) // Give a bit more time for transitions
    }
  }, [activeEvent, activePoll, pollOptions, pollResults])

  const fetchPolls = useCallback(async (eventId: string) => {
    try {
      console.log('poll-monitor fetchPolls called for event:', eventId)
      const poll = await getActivePoll(eventId)
      console.log('poll-monitor Active poll found:', poll)
      setActivePoll(poll)
      
      if (poll) {
        const options = await getPollOptions(poll.id)
        console.log('poll-monitor Poll options:', options)
        setPollOptions(options)
        
        const results = await getPollResultsWithOptions(poll.id, options)
        console.log('poll-monitor Poll results:', results)
        setPollResults(results)
      } else {
        console.log('poll-monitor No active poll, clearing options and results')
        setPollOptions([])
        setPollResults([])
      }
      

    } catch (error) {
      console.error('Error fetching polls:', error)
    }
  }, [])

  const getTotalVotes = useCallback(() => {
    return pollResults.reduce((sum, result) => sum + result.vote_count, 0)
  }, [pollResults])

  // Handle poll transitions
  const handlePollTransition = useCallback(() => {
    console.log('Poll transition detected on monitor, refreshing data...')
    if (activeEvent) {
      // Clear ended poll data when new poll starts
      setEndedPoll(null)
      setEndedPollOptions([])
      setEndedPollResults([])
      // Reset poll ended state for new polls
      setPollEnded(false)
      // Refresh poll data
      fetchPolls(activeEvent.id)
    }
  }, [activeEvent, fetchPolls])

  // Set up auto-transitions
  const { startMonitoring, stopMonitoring } = usePollTransitions(
    activeEvent?.id || null, 
    handlePollTransition
  )

  const getEventStatus = () => {
    if (!activeEvent) return 'No Event'
    
    const now = new Date()
    const startTime = new Date(activeEvent.starts_at)
    const endTime = new Date(activeEvent.ends_at)
    
    if (now < startTime) return 'Upcoming'
    if (now > endTime) return 'Ended'
    return 'Live'
  }

  // Start/stop poll transition monitoring
  useEffect(() => {
    if (activeEvent) {
      startMonitoring()
      return () => {
        stopMonitoring()
      }
    }
  }, [activeEvent, startMonitoring, stopMonitoring])

  useEffect(() => {
    const init = async () => {
      try {
        // Get active event
        const { data: events } = await supabase
          .from('events')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(1)

        if (events && events.length > 0) {
          const event = events[0]
          setActiveEvent(event)
          await fetchPolls(event.id)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error initializing:', error)
        setLoading(false)
      }
    }

    init()
  }, [fetchPolls])

  // Subscribe to poll vote changes
  useEffect(() => {
    if (!activePoll) return

    const unsubscribe = subscribePollVotes(activePoll.id, async () => {
      const results = await getPollResultsWithOptions(activePoll.id, pollOptions)
      setPollResults(results)
    })

    return unsubscribe
  }, [activePoll])

  // Real-time subscriptions for events and polls
  useEffect(() => {
    const eventChannel = supabase
      .channel('events-monitor')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'events' },
        async () => {
          // Refresh active event
          const { data: events } = await supabase
            .from('events')
            .select('*')
            .eq('active', true)
            .order('created_at', { ascending: false })
            .limit(1)

          if (events && events.length > 0) {
            const event = events[0]
            setActiveEvent(event)
            await fetchPolls(event.id)
          } else {
            setActiveEvent(null)
            setActivePoll(null)
            setPollOptions([])
            setPollResults([])
          }
        }
      )
      .subscribe()

    const pollChannel = supabase
      .channel('polls-monitor')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'polls' },
        async () => {
          if (activeEvent) {
            await fetchPolls(activeEvent.id)
          }
        }
      )
      .subscribe()

    return () => {
      eventChannel.unsubscribe()
      pollChannel.unsubscribe()
    }
  }, [activeEvent, fetchPolls])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-md border">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading poll monitor...</p>
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



      {/* Content */}
      <div className="max-w-4xl mx-auto">

        {/* Poll Content */}
        {!activeEvent ? (
          <div className="text-center py-16">
            <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h3 className={`${gothamMedium.className} text-2xl text-gray-700 mb-3`}>No Active Event</h3>
            <p className={`${gothamBook.className} text-lg text-gray-500`}>
              There are currently no active events. Check back later for live polls!
            </p>
          </div>
        ) : !activePoll ? (
          // Show ended poll results if available, otherwise show "no active poll" message
          endedPoll ? (
            <div className="space-y-12">
              {/* Poll Question */}
              <div className="text-center">
                <h2 className={`${gothamUltra.className} text-5xl sm:text-6xl md:text-7xl text-gray-900 mb-4`}>
                  {endedPoll.question}
                </h2>
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className={`${gothamMedium.className} text-xl text-gray-600`}>
                    {endedPollResults.reduce((sum, result) => sum + result.vote_count, 0)} total votes
                  </div>
                </div>
                
                {/* Show correct answer for ended poll */}
                {endedPoll.correct_option_id && (
                  <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
                    <div className="flex items-center justify-center gap-2 text-green-800">
                      <CheckCircle className="h-6 w-6" />
                      <span className={`${gothamUltra.className} text-2xl font-bold`}>
                        Poll Ended - Correct Answer: {
                          endedPollOptions.find(opt => opt.id === endedPoll.correct_option_id)?.label || 'Unknown'
                        }
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Poll Results for ended poll */}
              <div className="space-y-8 max-w-3xl mx-auto">
                {endedPollOptions.length > 0 ? (
                  endedPollOptions.map((option) => {
                    const result = endedPollResults.find(r => r.option_id === option.id)
                    const voteCount = result?.vote_count || 0
                    const percentage = result?.percentage || 0
                    const isCorrectAnswer = endedPoll.correct_option_id === option.id
                    
                    return (
                      <div 
                        key={option.id} 
                        className={`flex items-center justify-between p-8 rounded-2xl shadow-lg transition-all duration-300 ${
                          isCorrectAnswer 
                            ? 'bg-green-50 border-2 border-green-300 ring-4 ring-green-100' 
                            : 'bg-white border border-gray-200'
                        }`}
                      >
                        {/* Option Text */}
                        <div className="flex items-center space-x-4">
                          <div className={`w-4 h-4 rounded-full ${
                            isCorrectAnswer ? 'bg-green-500' : 'bg-gray-300'
                          }`} />
                          <span className={`${gothamUltra.className} text-3xl sm:text-4xl text-gray-900 font-bold`}>
                            {option.label}
                          </span>
                          {isCorrectAnswer && (
                            <CheckCircle className="h-8 w-8 text-green-600" />
                          )}
                        </div>
                        
                        {/* Vote Count and Progress */}
                        <div className="flex items-center space-x-6">
                          <div className="text-right">
                            <div className={`${gothamUltra.className} text-4xl sm:text-5xl font-bold ${
                              isCorrectAnswer ? 'text-green-600' : 'text-gray-900'
                            }`}>
                              {voteCount}
                            </div>
                            <div className="text-lg text-gray-500 font-medium">
                              {percentage}%
                            </div>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="w-48 sm:w-64">
                            <Progress 
                              value={percentage} 
                              className={`h-6 ${
                                isCorrectAnswer 
                                  ? 'bg-green-100' 
                                  : 'bg-gray-200'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8">
                    <p className={`${gothamBook.className} text-lg text-gray-500`}>
                      No poll options available.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-6" />
              <h3 className={`${gothamMedium.className} text-2xl text-gray-700 mb-3`}>No Active Poll</h3>
              <p className={`${gothamBook.className} text-lg text-gray-500`}>
                No poll is currently active. Stay tuned for the next question!
              </p>
            </div>
          )
        ) : (
          <div className="space-y-12">
            {/* Poll Question */}
            <div className="text-center">
              <h2 className={`${gothamUltra.className} text-5xl sm:text-6xl md:text-7xl text-gray-900 mb-4`}>
                {activePoll.question}
              </h2>
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className={`${gothamMedium.className} text-xl text-gray-600`}>
                  {getTotalVotes()} total votes
                </div>
                {activePoll.ends_at && (
                  <PollTimer 
                    endsAt={activePoll.ends_at} 
                    onExpire={handlePollExpiry}
                    className="text-lg"
                  />
                )}
              </div>
              
              {/* Show correct answer when poll ends */}
              {pollEnded && activePoll.correct_option_id && (
                <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
                  <div className="flex items-center justify-center gap-2 text-green-800">
                    <CheckCircle className="h-6 w-6" />
                    <span className={`${gothamUltra.className} text-2xl font-bold`}>
                      Correct Answer: {
                        pollOptions.find(opt => opt.id === activePoll.correct_option_id)?.label || 'Unknown'
                      }
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Poll Results - Left Aligned with Bars */}
            <div className="space-y-8 max-w-3xl mx-auto">
              {pollOptions.length > 0 ? (
                pollOptions.map((option) => {
                  const result = pollResults.find(r => r.option_id === option.id)
                  const voteCount = result?.vote_count || 0
                  const percentage = result?.percentage || 0
                  const isCorrectAnswer = activePoll?.correct_option_id === option.id
                  
                  return (
                    <div key={option.id} className="space-y-3">
                      {/* Option Label and Vote Count */}
                      <div className="flex items-center justify-between">
                        <div className={`${gothamUltra.className} text-3xl sm:text-4xl font-bold ${
                          isCorrectAnswer && pollEnded 
                            ? 'text-green-700' 
                            : 'text-gray-900'
                        }`}>
                          {option.label}
                          {isCorrectAnswer && pollEnded && (
                            <span className="text-green-600 ml-3">✅</span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className={`${gothamUltra.className} text-2xl sm:text-3xl font-bold ${
                            isCorrectAnswer && pollEnded ? 'text-green-600' : 'text-blue-600'
                          }`}>
                            {voteCount}
                          </div>
                          <div className={`${gothamBook.className} text-sm text-gray-500`}>
                            votes
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="relative">
                        <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ease-out ${
                              isCorrectAnswer && pollEnded
                                ? 'bg-gradient-to-r from-green-500 to-green-600'
                                : 'bg-gradient-to-r from-blue-500 to-blue-600'
                            }`}
                            style={{ width: `${Math.max(percentage, 2)}%` }}
                          />
                        </div>
                        {/* Percentage always inside the bar, left-aligned */}
                        <div className="absolute inset-0 flex items-center pl-3">
                          <span className={`${gothamMedium.className} text-white text-sm font-semibold drop-shadow-sm`}>
                            {percentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center">
                  <div className={`${gothamMedium.className} text-xl text-gray-600`}>
                    Loading poll options...
                  </div>
                  <div className={`${gothamBook.className} text-sm text-gray-500 mt-2`}>
                    Poll ID: {activePoll?.id || 'None'}
                  </div>
                  <div className={`${gothamBook.className} text-sm text-gray-500`}>
                    Options count: {pollOptions.length}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}



      </div>
    </div>
  )
}
