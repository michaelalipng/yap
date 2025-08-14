'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BarChart3, 
  TrendingUp,
  CheckCircle
} from 'lucide-react'
import { getPollOptions, getPollResults, castVote, getMyVote } from '@/lib/polls/api'
import { useRealtimePolls } from './RealtimePollProvider'
import { supabase } from '@/lib/supabaseClient'

interface PollOption {
  id: string
  poll_id: string
  label: string
  created_at: string
  emoji?: string
  unique?: string
}

interface PollResult {
  option_id: string
  option_text: string
  vote_count: number
  percentage: number
}

interface Poll {
  id: string
  question: string
  type: string
  duration?: number
  created_at: string
  event_id?: string
  active?: boolean
}

interface PollProps {
  poll: Poll
  userId?: string
  onVote?: () => void
}

export default function Poll({ poll, userId, onVote }: PollProps) {
  const [options, setOptions] = useState<PollOption[]>([])
  const [results, setResults] = useState<PollResult[]>([])
  const [userVote, setUserVote] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [animateVote, setAnimateVote] = useState<string | null>(null)
  const [totalVotes, setTotalVotes] = useState(0)
  const [optionsLoading, setOptionsLoading] = useState(false)
  
  // Get real-time poll context
  const { subscribeToPoll } = useRealtimePolls()

  // Debug: log poll data
  useEffect(() => {
    console.log('Poll component received poll:', poll)
    console.log('Poll type:', poll.type)
    console.log('Poll ID:', poll.id)
  }, [poll])

  // Load poll options from database
  useEffect(() => {
    const loadOptions = async () => {
      setOptionsLoading(true)
      try {
        console.log('Loading real options for poll:', poll.id)
        const pollOptions = await getPollOptions(poll.id)
        console.log('Loaded poll options:', pollOptions)
        setOptions(pollOptions)
      } catch (error) {
        console.error('Error loading poll options:', error)
        // Fallback to placeholder options if database fails
        if (poll.type === 'yes_no' || poll.type === 'yesno') {
          setOptions([
            { id: 'yes', poll_id: poll.id, label: 'Yes', created_at: new Date().toISOString() },
            { id: 'no', poll_id: poll.id, label: 'No', created_at: new Date().toISOString() }
          ])
        } else {
          setOptions([
            { id: 'option1', poll_id: poll.id, label: 'Option 1', created_at: new Date().toISOString() },
            { id: 'option2', poll_id: poll.id, label: 'Option 2', created_at: new Date().toISOString() },
            { id: 'option3', poll_id: poll.id, label: 'Option 3', created_at: new Date().toISOString() }
          ])
        }
      } finally {
        setOptionsLoading(false)
      }
    }
    
    loadOptions()
  }, [poll.id, poll.type])

  // Load real results from database
  useEffect(() => {
    const loadResults = async () => {
      if (options.length === 0) return
      
      try {
        console.log('Loading real results for poll:', poll.id)
        const pollResults = await getPollResults(poll.id)
        console.log('Loaded poll results:', pollResults)
        setResults(pollResults)
        const total = pollResults.reduce((sum: number, result: PollResult) => sum + result.vote_count, 0)
        setTotalVotes(total)
      } catch (error) {
        console.error('Error loading poll results:', error)
        // Fallback to placeholder results if database fails
        const placeholderResults = options.map((option) => ({
          option_id: option.id,
          option_text: option.label,
          vote_count: Math.floor(Math.random() * 10) + 1,
          percentage: Math.floor(Math.random() * 40) + 10
        }))
        setResults(placeholderResults)
        const total = placeholderResults.reduce((sum: number, result: PollResult) => sum + result.vote_count, 0)
        setTotalVotes(total)
      }
    }
    
    loadResults()
  }, [poll.id, options])

  // Subscribe to real-time updates for this poll
  useEffect(() => {
    if (!poll.event_id) return

    const unsubscribe = subscribeToPoll(poll.event_id)
    
    return () => {
      unsubscribe()
    }
  }, [poll.event_id, subscribeToPoll])

  // Refresh results when poll changes (for real-time updates)
  useEffect(() => {
    if (poll.id && options.length > 0) {
      const refreshResults = async () => {
        try {
          const pollResults = await getPollResults(poll.id)
          setResults(pollResults)
          const total = pollResults.reduce((sum: number, result: PollResult) => sum + result.vote_count, 0)
          setTotalVotes(total)
        } catch (error) {
          console.error('Error refreshing poll results:', error)
        }
      }
      
      refreshResults()
    }
  }, [poll.id, options.length])

  // Check user's current vote from database
  useEffect(() => {
    const checkUserVote = async () => {
      if (!userId || !poll.id) return
      
      try {
        const vote = await getMyVote(poll.id, userId)
        setUserVote(vote?.option_id || null)
      } catch (error) {
        console.error('Error checking user vote:', error)
        setUserVote(null)
      }
    }
    
    checkUserVote()
  }, [poll.id, userId])

  const handleVote = async (optionId: string) => {
    if (userVote) {
      console.log('User has already voted')
      return
    }
    
    try {
      console.log('Casting vote for option:', optionId)
      const success = await castVote(poll.id, optionId, userId)
      
      if (success) {
        setUserVote(optionId)
        setAnimateVote(optionId)
        setTimeout(() => setAnimateVote(null), 1000)
        
        // Refresh results after voting
        const pollResults = await getPollResults(poll.id)
        setResults(pollResults)
        const total = pollResults.reduce((sum: number, result: PollResult) => sum + result.vote_count, 0)
        setTotalVotes(total)
        
        // Call onVote callback if provided
        if (onVote && typeof onVote === 'function') {
          try {
            onVote()
          } catch (callbackError) {
            console.warn('Error in onVote callback:', callbackError)
          }
        }
      } else {
        console.error('Failed to cast vote')
        alert('Failed to cast vote. Please try again.')
      }
    } catch (error) {
      console.error('Error casting vote:', error)
      alert('Error casting vote: ' + String(error))
    }
  }

  const getWinningOptions = () => {
    if (totalVotes === 0) return []
    
    const maxVotes = Math.max(...results.map(r => r.vote_count))
    return results
      .filter(result => result.vote_count === maxVotes)
      .map(result => result.option_id)
  }

  const winningOptions = getWinningOptions()

  return (
    <Card className="w-full max-w-2xl mx-auto border-2 border-blue-100 hover:border-blue-200 transition-all duration-300 hover:shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <CardTitle className="text-xl leading-tight text-white">
              {poll.question}
            </CardTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {/* Removed timer display */}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowResults(!showResults)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            {showResults ? <BarChart3 className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">


        {!showResults ? (
          /* Voting Interface */
          <div className="space-y-3">
            {optionsLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading options...</p>
              </div>
            ) : options.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No options found for this poll. Please contact the administrator.</p>
              </div>
            ) : (
              options.map((option) => {
                const isSelected = userVote === option.id
                const isAnimated = animateVote === option.id
                
                return (
                  <Button
                    key={option.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleVote(option.id)}
                    disabled={!poll.active} // Enable voting for active polls
                    className={`w-full h-10 text-sm font-medium transition-all duration-300 ${
                      isSelected 
                        ? 'bg-blue-500 text-white border-0 shadow-md' 
                        : 'hover:bg-blue-50 hover:border-blue-300 border-2'
                    } ${
                      isAnimated ? 'animate-pulse ring-2 ring-blue-300' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="flex items-center gap-2">
                        {isSelected ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-current" />
                        )}
                        {option.label}
                      </span>
                    </div>
                  </Button>
                )
              })
            )}
            
            {!poll.active && (
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                <p className="text-gray-600 font-medium">This poll has ended</p>
                <Button
                  variant="link"
                  onClick={() => setShowResults(true)}
                  className="text-blue-600 p-0 h-auto"
                >
                  View results
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Results Interface */
          <div className="space-y-3">
            {results.map((result) => {
              const isWinning = winningOptions.includes(result.option_id)
              const isUserVote = userVote === result.option_id
              
              return (
                <div key={result.option_id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{result.option_text}</span>
                      {isWinning && totalVotes > 0 && (
                        <BarChart3 className="h-3 w-3 text-blue-500" />
                      )}
                      {isUserVote && (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm">{result.percentage}%</div>
                      <div className="text-xs text-muted-foreground">
                        {result.vote_count} vote{result.vote_count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-3 rounded-full transition-all duration-1000 ease-out ${
                          isWinning 
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                            : 'bg-gradient-to-r from-blue-400 to-blue-600'
                        }`}
                        style={{ width: `${result.percentage}%` }}
                      />
                    </div>
                    
                    {/* Percentage indicator */}
                    <div 
                      className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white"
                      style={{ 
                        left: `${Math.min(result.percentage, 95)}%`,
                        transform: 'translateX(-50%)'
                      }}
                    >
                      {result.percentage > 10 && result.percentage}
                    </div>
                  </div>
                </div>
              )
            })}
            

          </div>
        )}
      </CardContent>
    </Card>
  )
} 