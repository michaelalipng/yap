// TODO: Implement poll backend service
// This file contains stubs for future poll functionality

export interface Poll {
  id: string
  question: string
  type: 'yesno' | 'multiple' | 'emoji'
  options: string[]
  active: boolean
  created_at: string
  event_id?: string
  duration?: number
}

export interface PollOption {
  id: string
  poll_id: string
  text: string
  created_at: string
}

export interface PollResult {
  option_id: string
  option_text: string
  vote_count: number
  percentage: number
}

export interface PollVote {
  poll_id: string
  option_id: string
  user_id: string
}

// TODO: Implement these functions with new backend
export const loadPolls = async (): Promise<Poll[]> => {
  // TODO: Implement poll loading from new backend
  console.warn('loadPolls not implemented - polls are offline')
  return []
}

export const loadPoll = async (): Promise<Poll | null> => {
  // TODO: Implement single poll loading from new backend
  console.warn('loadPoll not implemented - polls are offline')
  return null
}

export const castVote = async (): Promise<boolean> => {
  // TODO: Implement vote casting with new backend
  console.warn('castVote not implemented - polls are offline')
  return false
}

export const getResults = async (): Promise<PollResult[]> => {
  // TODO: Implement results fetching from new backend
  console.warn('getResults not implemented - polls are offline')
  return []
}

export const subscribeResults = (): (() => void) => {
  // TODO: Implement real-time subscription with new backend
  console.warn('subscribeResults not implemented - polls are offline')
  return () => {} // Return empty cleanup function
}
