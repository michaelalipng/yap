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
      const poll = await getActivePoll(eventId)
      setActivePoll(poll)
      
      if (poll) {
        const options = await getPollOptions(poll.id)
        setPollOptions(options)
        
        const results = await getPollResultsWithOptions(poll.id, options)
        setPollResults(results)
      } else {
        setPollOptions([])
        setPollResults([])
      }

      const queued = await getQueuedPolls(eventId)
      setQueuedPolls(queued)
    } catch (error) {
      console.error('Error fetching polls:', error)
    }
  }, [])

  const getTotalVotes = useCallback(() => {
    return pollResults.reduce((sum, result) => sum + result.vote_count, 0)
  }, [pollResults])

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
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-blue-600 hover:bg-blue-500 border-0 shadow-lg hover:shadow-blue-500/25 transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Poll
              </Button>
              {queuedPolls.length > 0 && (
                <Button
                  onClick={() => {/* handleStartNext */}}
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
                                onClick={() => {/* handleStartSpecificPoll */}}
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
    </div>
  )
}
