'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Poll, PollOption, PollResult, getActivePoll, getPollOptions, getPollResultsWithOptions, subscribePollVotes, getQueuedPolls, createTimedPoll, deactivatePoll } from '@/lib/polls/api'
import { usePollTransitions, endCurrentAndStartNext } from '@/lib/polls/transitions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { BarChart3, Users, Clock, CheckCircle, Plus, Play, Square, Trash2, TrendingUp } from 'lucide-react'
import { gothamMedium, gothamUltra } from '@/lib/fonts'
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

export default function PollModerationPage() {
  const [activeEvent, setActiveEvent] = useState<Event | null>(null)
  const [activePoll, setActivePoll] = useState<Poll | null>(null)
  const [pollOptions, setPollOptions] = useState<PollOption[]>([])
  const [pollResults, setPollResults] = useState<PollResult[]>([])
  const [queuedPolls, setQueuedPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [pollEnded, setPollEnded] = useState(false)

  // Poll creation form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPollQuestion, setNewPollQuestion] = useState('')
  const [newPollOptions, setNewPollOptions] = useState(['Yes', 'No'])
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0)
  const [durationMinutes, setDurationMinutes] = useState(2)
  const [autoStart, setAutoStart] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const fetchPolls = useCallback(async (eventId: string) => {
    try {
      console.log('fetchPolls called for event:', eventId)
      const poll = await getActivePoll(eventId)
      console.log('Active poll found:', poll)
      setActivePoll(poll)
      
      if (poll) {
        const options = await getPollOptions(poll.id)
        console.log('Poll options:', options)
        setPollOptions(options)
        
        const results = await getPollResultsWithOptions(poll.id, options)
        console.log('Poll results:', results)
        setPollResults(results)
      } else {
        console.log('No active poll, clearing options and results')
        setPollOptions([])
        setPollResults([])
      }

      const queued = await getQueuedPolls(eventId)
      console.log('Queued polls:', queued)
      setQueuedPolls(queued)
    } catch (error) {
      console.error('Error fetching polls:', error)
    }
  }, [])

  const getTotalVotes = useCallback(() => {
    return pollResults.reduce((sum, result) => sum + result.vote_count, 0)
  }, [pollResults])

  const handleCreatePoll = async () => {
    console.log('handleCreatePoll called', { 
      activeEvent: activeEvent?.id, 
      question: newPollQuestion, 
      options: newPollOptions 
    })
    
    if (!activeEvent) {
      console.error('No active event found')
      return
    }
    
    if (!newPollQuestion.trim()) {
      console.error('Poll question is empty')
      return
    }

    try {
      setIsCreating(true)
      console.log('Creating poll...')
      
      const pollType = newPollOptions.length === 2 && 
                      newPollOptions[0] === 'Yes' && 
                      newPollOptions[1] === 'No' ? 'yes_no' : 'multi'
      
      console.log('Poll data:', {
        question: newPollQuestion,
        type: pollType,
        options: newPollOptions,
        correctIndex: correctOptionIndex,
        duration: durationMinutes * 60,
        eventId: activeEvent.id,
        autoStart
      })
      
      const pollId = await createTimedPoll(
        newPollQuestion,
        pollType,
        newPollOptions,
        correctOptionIndex,
        durationMinutes * 60, // Convert to seconds
        activeEvent.id,
        autoStart
      )

      console.log('Poll created with ID:', pollId)

      if (pollId) {
        // Reset form
        setNewPollQuestion('')
        setNewPollOptions(['Yes', 'No'])
        setCorrectOptionIndex(0)
        setDurationMinutes(2)
        setAutoStart(false)
        setShowCreateForm(false)

        // Refresh polls
        await fetchPolls(activeEvent.id)
        console.log('Poll creation completed successfully')
      } else {
        console.error('Poll creation failed - no ID returned')
      }
    } catch (error) {
      console.error('Error creating poll:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const addPollOption = () => {
    setNewPollOptions([...newPollOptions, `Option ${newPollOptions.length + 1}`])
  }

  const removePollOption = (index: number) => {
    if (newPollOptions.length > 2) {
      const newOptions = newPollOptions.filter((_, i) => i !== index)
      setNewPollOptions(newOptions)
      if (correctOptionIndex >= newOptions.length) {
        setCorrectOptionIndex(0)
      }
    }
  }

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...newPollOptions]
    newOptions[index] = value
    setNewPollOptions(newOptions)
  }

  const handleStartNext = async () => {
    console.log('Start Next button clicked', { 
      activeEvent: activeEvent?.id, 
      queuedPolls: queuedPolls.length 
    })
    
    if (!activeEvent) {
      console.error('No active event - cannot start next poll')
      return
    }
    
    if (queuedPolls.length === 0) {
      console.error('No queued polls - cannot start next poll')
      return
    }

    try {
      console.log('Starting next poll...')
      const success = await endCurrentAndStartNext(activeEvent.id)
      
      if (success) {
        console.log('Successfully started next poll')
        // Refresh polls to show the new active poll
        await fetchPolls(activeEvent.id)
      } else {
        console.error('Failed to start next poll')
      }
    } catch (error) {
      console.error('Error starting next poll:', error)
    }
  }

  const handleStartSpecificPoll = async (pollId: string) => {
    if (!activeEvent) return

    try {
      console.log('Starting specific poll:', pollId)
      
      // First deactivate current poll if there is one
      if (activePoll) {
        await deactivatePoll(activePoll.id)
      }
      
      // Activate the specific poll
      const { error } = await supabase
        .from('polls')
        .update({ 
          active: true, 
          status: 'active',
          starts_at: new Date().toISOString()
        })
        .eq('id', pollId)
      
      if (error) {
        console.error('Error activating poll:', error)
        return
      }
      
      console.log('Successfully started specific poll')
      // Refresh polls to show the new active poll
      await fetchPolls(activeEvent.id)
    } catch (error) {
      console.error('Error starting specific poll:', error)
    }
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

  useEffect(() => {
    const init = async () => {
      try {
        console.log('Initializing poll-mod page...')
        const { data: events } = await supabase
          .from('events')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(1)

        console.log('Found events:', events)

        if (events && events.length > 0) {
          const event = events[0]
          console.log('Setting active event:', event.id)
          setActiveEvent(event)
          await fetchPolls(event.id)
        } else {
          console.log('No active events found')
        }

        setLoading(false)
      } catch (error) {
        console.error('Error initializing:', error)
        setLoading(false)
      }
    }

    init()
  }, [fetchPolls])

  // Subscribe to event changes
  useEffect(() => {
    const channel = supabase
      .channel('poll-mod-events')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        (payload) => {
          console.log('poll-mod: Event change detected:', payload)
          // Reload when events change
          if (activeEvent) {
            fetchPolls(activeEvent.id)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeEvent, fetchPolls])

  // Subscribe to poll changes for the active event
  useEffect(() => {
    if (!activeEvent) return

    console.log('poll-mod: Setting up poll subscription for event:', activeEvent.id)
    
    const channel = supabase
      .channel(`poll-mod-polls-${activeEvent.id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'polls',
          filter: `event_id=eq.${activeEvent.id}`
        },
        (payload) => {
          console.log('poll-mod: Poll change detected for event:', activeEvent.id, payload)
          // Reload content to get the new/updated poll
          setTimeout(() => {
            fetchPolls(activeEvent.id)
          }, 500) // Small delay to ensure DB is consistent
        }
      )
      .subscribe()

    return () => {
      console.log('poll-mod: Cleaning up poll subscription for event:', activeEvent.id)
      supabase.removeChannel(channel)
    }
  }, [activeEvent, fetchPolls])

  // Subscribe to poll options changes
  useEffect(() => {
    if (!activePoll) return

    console.log('poll-mod: Setting up poll options subscription for poll:', activePoll.id)
    
    const channel = supabase
      .channel(`poll-mod-options-${activePoll.id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'poll_options',
          filter: `poll_id=eq.${activePoll.id}`
        },
        (payload) => {
          console.log('poll-mod: Poll options change detected for poll:', activePoll.id, payload)
          // Reload content to get updated options
          if (activeEvent) {
            setTimeout(() => {
              fetchPolls(activeEvent.id)
            }, 200)
          }
        }
      )
      .subscribe()

    return () => {
      console.log('poll-mod: Cleaning up poll options subscription for poll:', activePoll.id)
      supabase.removeChannel(channel)
    }
  }, [activePoll, activeEvent, fetchPolls])

  // Subscribe to poll vote changes for real-time results
  useEffect(() => {
    if (!activePoll) return

    console.log('poll-mod: Setting up poll votes subscription for poll:', activePoll.id)

    const unsubscribe = subscribePollVotes(activePoll.id, async () => {
      console.log('poll-mod: Poll votes changed, refreshing results')
      // Refresh results when votes change
      if (pollOptions.length > 0) {
        const results = await getPollResultsWithOptions(activePoll.id, pollOptions)
        setPollResults(results)
      }
    })

    return unsubscribe
  }, [activePoll, pollOptions])

  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center bg-slate-800/50 backdrop-blur-sm p-12 rounded-2xl shadow-2xl border border-slate-700">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-6"></div>
          <p className="text-white font-medium text-lg mb-2">Loading moderation panel...</p>
          <p className="text-slate-400 text-sm">Preparing your poll management interface</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link 
              href="https://www.healingplacechurch.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block hover:opacity-80 transition-opacity duration-200"
            >
              <Image
                src="/HPClogo.png"
                alt="Healing Place Church Logo"
                width={60}
                height={60}
                className="w-12 h-12 object-contain"
              />
            </Link>

            {/* Title and Status */}
            <div className="flex-1 text-center">
              <h1 className={`${gothamUltra.className} text-3xl text-white mb-2`}>
                Poll Moderation
              </h1>
              {activeEvent && (
                <div className={`${gothamMedium.className} flex items-center justify-center gap-3`}>
                  {getEventStatus() === 'Live' && (
                    <div className="flex items-center gap-2 bg-green-500/20 px-3 py-1 rounded-full border border-green-500/30">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-green-300 font-semibold text-sm">Live Event</span>
                    </div>
                  )}
                  {getEventStatus() === 'Upcoming' && (
                    <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
                      <div className="w-2 h-2 bg-amber-400 rounded-full" />
                      <span className="text-amber-300 font-semibold text-sm">Upcoming</span>
                    </div>
                  )}
                  {getEventStatus() === 'Ended' && (
                    <div className="flex items-center gap-2 bg-slate-500/20 px-3 py-1 rounded-full border border-slate-500/30">
                      <div className="w-2 h-2 bg-slate-400 rounded-full" />
                      <span className="text-slate-300 font-semibold text-sm">Ended</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  console.log('New Poll button clicked', { activeEvent: activeEvent?.id })
                  setShowCreateForm(!showCreateForm)
                }}
                className="bg-blue-600 hover:bg-blue-500 border-0 shadow-lg hover:shadow-blue-500/25 transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Poll
              </Button>
              {queuedPolls.length > 0 && (
                <Button
                  onClick={handleStartNext}
                  className="bg-green-600 hover:bg-green-500 border-0 shadow-lg hover:shadow-green-500/25 transition-all duration-200 text-white"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Active Poll Monitor */}
            <div className="lg:col-span-2">
              <Card className="bg-slate-800/50 border border-slate-700 backdrop-blur-sm shadow-2xl">
                <CardHeader className="border-b border-slate-700">
                  <CardTitle className={`${gothamMedium.className} text-xl text-white flex items-center gap-3`}>
                    {activePoll ? (
                      <>
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                        Active Poll
                      </>
                    ) : (
                      <>
                        <div className="w-3 h-3 bg-slate-500 rounded-full" />
                        No Active Poll
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {!activePoll ? (
                    <div className="text-center py-12">
                      <div className="bg-slate-700/30 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                        <BarChart3 className="h-10 w-10 text-slate-400" />
                      </div>
                      <p className="text-slate-300 text-lg">No poll is currently active</p>
                      <p className="text-slate-500 text-sm mt-2">Create a new poll or start one from the queue</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Question */}
                      <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-600">
                        <h3 className={`${gothamUltra.className} text-2xl text-white mb-4`}>
                          {activePoll.question}
                        </h3>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-2 bg-blue-500/20 px-3 py-1 rounded-full border border-blue-500/30">
                            <Users className="h-4 w-4 text-blue-400" />
                            <span className="text-blue-300 font-semibold">{getTotalVotes()} votes</span>
                          </div>
                        </div>
                      </div>

                      {/* Results */}
                      <div className="space-y-4">
                        {pollResults.map((result, index) => {
                          const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500']
                          const bgColor = colors[index % colors.length]
                          
                          return (
                            <div key={result.option_id} className="bg-slate-900/30 rounded-xl p-4 border border-slate-600">
                              <div className="flex justify-between items-center mb-3">
                                <span className={`${gothamMedium.className} text-lg text-white`}>
                                  {result.option_text}
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className={`${gothamUltra.className} text-2xl font-bold text-blue-400`}>
                                    {result.vote_count}
                                  </span>
                                  <span className="text-slate-400 text-sm bg-slate-700/50 px-2 py-1 rounded-full">
                                    {result.percentage}%
                                  </span>
                                </div>
                              </div>
                              <div className="relative bg-slate-700 rounded-full h-3 overflow-hidden">
                                <div 
                                  className={`h-full ${bgColor} rounded-full transition-all duration-1000 ease-out`}
                                  style={{ width: `${result.percentage}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              <Card className="bg-slate-800/50 border border-slate-700 backdrop-blur-sm shadow-2xl">
                <CardHeader className="border-b border-slate-700">
                  <CardTitle className={`${gothamMedium.className} text-xl text-white flex items-center gap-3`}>
                    <Clock className="h-5 w-5 text-blue-400" />
                    Poll Queue 
                    <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {queuedPolls.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {queuedPolls.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="bg-slate-700/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                        <Clock className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-300 text-lg">No polls in queue</p>
                      <p className="text-slate-500 text-sm mt-2">Created polls will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {queuedPolls.map((poll, index) => (
                        <div key={poll.id} className="bg-slate-900/30 border border-slate-600 rounded-xl p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-2">
                                #{index + 1}
                              </Badge>
                              <p className={`${gothamMedium.className} text-sm text-slate-200`}>
                                {poll.question}
                              </p>
                            </div>
                            <div className="flex gap-2 ml-3">
                              <Button
                                onClick={() => handleStartSpecificPoll(poll.id)}
                                size="sm"
                                className="bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 p-2"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stats */}
              <Card className="bg-slate-800/50 border border-slate-700 backdrop-blur-sm shadow-2xl">
                <CardHeader className="border-b border-slate-700">
                  <CardTitle className={`${gothamMedium.className} text-xl text-white flex items-center gap-3`}>
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                    Session Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Active Poll:</span>
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                        activePoll ? 'bg-green-500/20 border border-green-500/30' : 'bg-slate-700/50 border border-slate-600'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${activePoll ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
                        <span className={`${gothamMedium.className} text-sm ${
                          activePoll ? 'text-green-300' : 'text-slate-400'
                        }`}>
                          {activePoll ? 'Active' : 'None'}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Total Votes:</span>
                      <div className="flex items-center gap-2 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30">
                        <Users className="h-4 w-4 text-purple-400" />
                        <span className={`${gothamMedium.className} text-sm text-purple-300`}>
                          {getTotalVotes()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Poll Creation Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-slate-800/95 border border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className={`${gothamMedium.className} text-xl text-white flex items-center justify-between`}>
                Create New Poll
                <Button
                  onClick={() => setShowCreateForm(false)}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </Button>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-6 space-y-6">
              {/* Question Input */}
              <div className="space-y-2">
                <label className={`${gothamMedium.className} text-sm text-slate-200`}>
                  Poll Question
                </label>
                <Textarea
                  value={newPollQuestion}
                  onChange={(e) => setNewPollQuestion(e.target.value)}
                  placeholder="Enter your poll question..."
                  className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500"
                  rows={3}
                />
              </div>

              {/* Poll Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className={`${gothamMedium.className} text-sm text-slate-200`}>
                    Poll Options
                  </label>
                  <Button
                    onClick={addPollOption}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {newPollOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Input
                        value={option}
                        onChange={(e) => updatePollOption(index, e.target.value)}
                        className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-400 focus:border-blue-500"
                        placeholder={`Option ${index + 1}`}
                      />
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={correctOptionIndex === index}
                          onCheckedChange={(checked) => checked && setCorrectOptionIndex(index)}
                          className="border-slate-600 data-[state=checked]:bg-green-600"
                        />
                        <span className="text-xs text-slate-400">Correct</span>
                      </div>
                      {newPollOptions.length > 2 && (
                        <Button
                          onClick={() => removePollOption(index)}
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 p-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Duration and Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={`${gothamMedium.className} text-sm text-slate-200`}>
                    Duration (minutes)
                  </label>
                  <Input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    max="60"
                    className="bg-slate-900/50 border-slate-600 text-white focus:border-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className={`${gothamMedium.className} text-sm text-slate-200`}>
                    Auto Start
                  </label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      checked={autoStart}
                      onCheckedChange={(checked) => setAutoStart(checked === true)}
                      className="border-slate-600 data-[state=checked]:bg-blue-600"
                    />
                    <span className="text-sm text-slate-300">Start immediately</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowCreateForm(false)}
                  variant="ghost"
                  className="flex-1 text-slate-400 hover:text-white border border-slate-600 hover:border-slate-500"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePoll}
                  disabled={!newPollQuestion.trim() || isCreating}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Poll
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
