'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, CheckCircle, X } from 'lucide-react'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorModal from '@/components/ErrorModal'
import { useErrorModal } from '@/lib/useErrorModal'
import { Poll, PollOption, PollResult, PollVote, getPollOptions, getMyVote, castVote, getPollResults, subscribePollVotes } from '@/lib/polls/api'

interface PollModalProps {
  poll: Poll
  userId: string
  onClose: () => void
}

export default function PollModal({ poll, userId, onClose }: PollModalProps) {
  const { showPollVoteError, hideError, ...errorModalState } = useErrorModal()
  const [options, setOptions] = useState<PollOption[]>([])
  const [results, setResults] = useState<PollResult[]>([])
  const [userVote, setUserVote] = useState<PollVote | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [isVoting, setIsVoting] = useState(false)
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [resultsLoading, setResultsLoading] = useState(false)

  // Load poll results
  const loadResults = useCallback(async () => {
    if (resultsLoading) return // Prevent multiple simultaneous calls
    
    setResultsLoading(true)
    try {
      const pollResults = await getPollResults(poll.id)
      setResults(pollResults)
    } catch (error) {
      console.error('Error loading poll results:', error)
      // Don't show error modal for loading errors to prevent loops
      // Just log the error and continue
    } finally {
      setResultsLoading(false)
    }
  }, [poll.id, resultsLoading])

  // Load poll results with loading state protection
  const loadResultsSafely = useCallback(async () => {
    if (optionsLoading || resultsLoading) return // Prevent loading while options or results are still loading
    await loadResults()
  }, [loadResults, optionsLoading, resultsLoading])

  // Load poll options and check user's vote
  useEffect(() => {
    const loadPollData = async () => {
      try {
        setOptionsLoading(true)
        
        // Load options and user's vote in parallel
        const [pollOptions, myVote] = await Promise.all([
          getPollOptions(poll.id),
          getMyVote(poll.id, userId)
        ])
        
        setOptions(pollOptions)
        setUserVote(myVote)
        
        // If user has already voted, show results immediately
        if (myVote) {
          setShowResults(true)
          await loadResults()
        }
      } catch (error) {
        console.error('Error loading poll data:', error)
        // Don't show error modal for loading errors to prevent loops
        // Just log the error and continue
      } finally {
        setOptionsLoading(false)
      }
    }

    loadPollData()
  }, [poll.id, userId, loadResults])

  // Subscribe to vote changes for live results
  useEffect(() => {
    if (poll.id) {
      const unsubscribe = subscribePollVotes(poll.id, loadResultsSafely)
      
      return unsubscribe
    }
  }, [poll.id, loadResultsSafely])

  // Handle voting
  const handleVote = async (optionId: string) => {
    if (isVoting || userVote) return
    
    setIsVoting(true)
    try {
      const success = await castVote(poll.id, optionId)
      if (success) {
        // Refresh results and show them
        await loadResults()
        setShowResults(true)
        
        // Update local state to show user has voted
        const votedOption = options.find(opt => opt.id === optionId)
        if (votedOption) {
          setUserVote({
            id: 'temp',
            poll_id: poll.id,
            option_id: optionId,
            user_id: userId,
            event_id: poll.event_id,
            created_at: new Date().toISOString()
          })
        }
      }
    } catch (error) {
      console.error('Error casting vote:', error)
      // Show user-friendly error modal
      if (error instanceof Error) {
        showPollVoteError(error, () => handleVote(optionId))
      } else {
        showPollVoteError(new Error('Failed to cast vote'), () => handleVote(optionId))
      }
    } finally {
      setIsVoting(false)
    }
  }

  // Get winning options
  const getWinningOptions = () => {
    if (results.length === 0) return []
    
    const maxVotes = Math.max(...results.map(r => r.vote_count))
    return results
      .filter(result => result.vote_count === maxVotes)
      .map(result => result.option_id)
  }

  const winningOptions = getWinningOptions()

  if (optionsLoading) {
    return <LoadingSpinner />
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <Card 
        className="max-w-md mx-4 w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <CardTitle className="text-xl leading-tight text-foreground">
                {poll.question}
              </CardTitle>

            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {!showResults ? (
            /* Voting Interface */
            <div className="space-y-3">
              {options.map((option) => {
                const isSelected = userVote?.option_id === option.id
                
                return (
                  <Button
                    key={option.id}
                    variant="outline"
                    size="lg"
                    onClick={() => handleVote(option.id)}
                    disabled={isVoting || !!userVote}
                    className={`w-full h-12 text-sm font-medium transition-all duration-300 ${
                      isSelected 
                        ? 'bg-green-500 text-white border-0 shadow-md' 
                        : 'hover:bg-green-50 hover:border-green-300 border-2'
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
              })}
              
              {userVote && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-green-700 text-sm font-medium">You have already voted!</p>
                  <Button
                    variant="link"
                    onClick={() => setShowResults(true)}
                    className="text-green-600 p-0 h-auto"
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
                const isUserVote = userVote?.option_id === result.option_id
                
                return (
                  <div key={result.option_id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{result.option_text}</span>
                        {isWinning && (
                          <BarChart3 className="h-3 w-3 text-green-500" />
                        )}
                        {isUserVote && (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm">{result.percentage}%</div>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                        <div 
                          className={`h-3 rounded-full transition-all duration-1000 ease-out ${
                            isWinning 
                              ? 'bg-gradient-to-r from-green-500 to-green-600' 
                              : 'bg-gradient-to-r from-blue-400 to-blue-600'
                          }`}
                          style={{ width: `${result.percentage}%` }}
                        />
                      </div>
                      
                      {/* Percentage indicator */}
                      {result.percentage > 10 && (
                        <div 
                          className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white"
                          style={{ 
                            left: `${Math.min(result.percentage, 95)}%`,
                            transform: 'translateX(-50%)'
                          }}
                        >
                          {result.percentage}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              

            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModalState.isOpen}
        onClose={hideError}
        onRetry={errorModalState.onRetry}
        title={errorModalState.title}
        message={errorModalState.message}
        error={errorModalState.error}
      />
    </div>
  )
}
