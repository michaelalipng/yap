'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Users, TrendingUp, Clock, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function PollResultsPanel() {
  const [polls, setPolls] = useState<{
    id: string;
    question: string;
    type: string;
    active: boolean;
    created_at: string;
    options: { id: string; poll_id: string; text: string; created_at: string }[];
    results: { option_id: string; option_text: string; vote_count: number; percentage: number }[];
  }[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPoll, setSelectedPoll] = useState<string | null>(null)
  const [_animateResults, setAnimateResults] = useState(false)

  useEffect(() => {
    // Polls are offline - use placeholder data
    const placeholderPolls = [
      {
        id: '1',
        question: 'Sample Poll Question 1',
        type: 'yesno',
        active: true,
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        options: [
          { id: 'yes', poll_id: '1', text: 'Yes', created_at: new Date().toISOString() },
          { id: 'no', poll_id: '1', text: 'No', created_at: new Date().toISOString() }
        ],
        results: [
          { option_id: 'yes', option_text: 'Yes', vote_count: 12, percentage: 60 },
          { option_id: 'no', option_text: 'No', vote_count: 8, percentage: 40 }
        ]
      },
      {
        id: '2',
        question: 'Sample Poll Question 2',
        type: 'multiple',
        active: false,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        options: [
          { id: 'opt1', poll_id: '2', text: 'Option 1', created_at: new Date().toISOString() },
          { id: 'opt2', poll_id: '2', text: 'Option 2', created_at: new Date().toISOString() },
          { id: 'opt3', poll_id: '2', text: 'Option 3', created_at: new Date().toISOString() }
        ],
        results: [
          { option_id: 'opt1', option_text: 'Option 1', vote_count: 5, percentage: 33 },
          { option_id: 'opt2', option_text: 'Option 2', vote_count: 8, percentage: 53 },
          { option_id: 'opt3', option_text: 'Option 3', vote_count: 2, percentage: 14 }
        ]
      }
    ]
    
    setPolls(placeholderPolls)
    setLoading(false)
    
    // Trigger animation after data loads
    setTimeout(() => setAnimateResults(true), 100)
  }, [])

  const getPollTypeIcon = (type: string) => {
    switch (type) {
      case 'yesno': return '✅❌'
      case 'multiple': return '🔘'
      case 'emoji': return '😊'
      default: return '📊'
    }
  }

  const getPollTypeColor = (type: string) => {
    switch (type) {
      case 'yesno': return 'from-green-500 to-blue-500'
      case 'multiple': return 'from-purple-500 to-pink-500'
      case 'emoji': return 'from-yellow-500 to-orange-500'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const getWinningOptions = (poll: {
    results: { option_id: string; option_text: string; vote_count: number; percentage: number }[];
  }) => {
    const results = poll.results || []
    if (results.length === 0) return []
    
    const maxVotes = Math.max(...results.map((r) => r.vote_count))
    return results
      .filter((r) => r.vote_count === maxVotes)
      .map((r) => r.option_text)
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const created = new Date(timestamp)
    const diffMs = now.getTime() - created.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMins > 0) return `${diffMins}m ago`
    return 'Just now'
  }

  if (loading) return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span className="ml-3 text-muted-foreground">Loading poll results...</span>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Poll Results Dashboard
        </h2>
        <p className="text-muted-foreground">
          Real-time insights from your community polls
        </p>
      </div>

      {/* Offline Notice */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
        <p className="text-yellow-700 font-medium">Polls are temporarily offline</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Polls</p>
                <p className="text-2xl font-bold text-blue-800">{polls.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">Total Votes</p>
                <p className="text-2xl font-bold text-green-800">
                  {polls.reduce((sum, poll) => {
                    const pollTotal = (poll.results || []).reduce((pSum: number, result: { vote_count: number }) => pSum + result.vote_count, 0)
                    return sum + pollTotal
                  }, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">Active Polls</p>
                <p className="text-2xl font-bold text-purple-800">
                  {polls.filter(p => p.active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Polls List */}
      <div className="space-y-4">
        {polls.map((poll, index) => {
          const results = poll.results || []
          const total = results.reduce((sum: number, result: { vote_count: number }) => sum + result.vote_count, 0)
          const winningOptions = getWinningOptions(poll)
          
          return (
            <Card 
              key={poll.id} 
              className="transition-all duration-500 opacity-100 translate-y-0"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg bg-gradient-to-r ${getPollTypeColor(poll.type)}`}>
                        <span className="text-white text-lg">{getPollTypeIcon(poll.type)}</span>
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg leading-tight">{poll.question}</CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(poll.created_at)}
                          </span>
                          <Badge variant={poll.active ? "default" : "secondary"}>
                            {poll.active ? 'Active' : 'Ended'}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {total} vote{total !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setSelectedPoll(selectedPoll === poll.id ? null : poll.id)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors duration-200"
                  >
                    <Zap className={`h-4 w-4 transition-transform duration-200 ${
                      selectedPoll === poll.id ? 'rotate-180' : ''
                    }`} />
                  </button>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {selectedPoll === poll.id && (
                  <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                    {results.map((result: { option_id: string; option_text: string; vote_count: number; percentage: number }) => {
                      const percent = total ? Math.round((result.vote_count / total) * 100) : 0
                      const isWinning = winningOptions.includes(result.option_text)
                      
                      return (
                        <div key={result.option_id} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{result.option_text}</span>
                              {isWinning && total > 0 && (
                                <BarChart3 className="h-4 w-4 text-blue-500" />
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-sm">{percent}%</div>
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
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            
                            {/* Percentage indicator */}
                            <div 
                              className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white"
                              style={{ 
                                left: `${Math.min(percent, 95)}%`,
                                transform: 'translateX(-50%)'
                              }}
                            >
                              {percent > 10 && percent}
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
        })}
      </div>

      {polls.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Polls Yet</h3>
            <p className="text-sm text-muted-foreground">
              Create your first poll to see results here
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
