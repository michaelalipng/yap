import { supabase } from '@/lib/supabaseClient'

// Check if required database tables exist
export const checkDatabaseTables = async () => {
  const tables = ['polls', 'poll_options', 'poll_votes']
  const results: { [key: string]: boolean } = {}
  
  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(1)
      
      results[table] = !error
      console.log(`Table ${table}: ${!error ? 'EXISTS' : 'MISSING'}`)
    } catch (error) {
      results[table] = false
      console.log(`Table ${table}: ERROR - ${error}`)
    }
  }
  
  return results
}

export interface Poll {
  id: string
  question: string
  type: 'yes_no' | 'multi'
  active: boolean
  created_at: string
  event_id: string
  created_by?: string
  correct_option_id?: string
  duration_seconds?: number
  starts_at?: string
  ends_at?: string
  status: 'draft' | 'active' | 'ended'
  queue_position?: number
  auto_start: boolean
}

export interface PollOption {
  id: string
  poll_id: string
  label: string
  position: number
  created_at: string
  emoji?: string
  unique?: string
}

export interface PollVote {
  id: string
  poll_id: string
  option_id: string
  user_id: string
  event_id: string
  unique: string
  created_at: string
}

export interface PollResult {
  option_id: string
  option_text: string
  vote_count: number
  percentage: number
}

// Get active poll for a specific event
export const getActivePoll = async (eventId: string): Promise<Poll | null> => {
  try {
    if (!eventId) {
      console.warn('getActivePoll: Missing eventId')
      return null
    }

    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .eq('active', true)
      .eq('event_id', eventId)
      .limit(1)
      .single()

    if (error) {
      console.error('Error fetching active poll:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Unexpected error in getActivePoll:', error)
    return null
  }
}

// Get poll options for a specific poll
export const getPollOptions = async (pollId: string): Promise<PollOption[]> => {
  try {
    console.log('Fetching poll options for poll:', pollId)
    
    const { data, error } = await supabase
      .from('poll_options')
      .select('*')
      .eq('poll_id', pollId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('Error fetching poll options:', error)
      return []
    }
    
    console.log('Fetched poll options:', data)
    console.log('Poll options count:', data?.length || 0)
    
    // If no options found, create some default options
    if (!data || data.length === 0) {
      console.log('No poll options found, creating default options')
      const defaultOptions = [
        { id: 'yes', poll_id: pollId, label: 'Yes', position: 0, created_at: new Date().toISOString() },
        { id: 'no', poll_id: pollId, label: 'No', position: 1, created_at: new Date().toISOString() }
      ]
      return defaultOptions
    }
    
    return data
  } catch (error) {
    console.error('Error fetching poll options:', error)
    return []
  }
}

// Check if user has already voted on a poll
export const getMyVote = async (pollId: string, userId: string): Promise<PollVote | null> => {
  try {
    const { data } = await supabase
      .from('poll_votes')
      .select('*')
      .eq('poll_id', pollId)
      .eq('user_id', userId)
      .maybeSingle()
      .throwOnError()

    return data
  } catch (error) {
    console.error('Error checking user vote:', error)
    return null
  }
}

// Cast a vote directly using the database
export const castVote = async (pollId: string, optionId: string, userId?: string): Promise<boolean> => {
  try {
    // Get current user if not provided
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id
    }
    
    if (!userId) {
      console.error('No user ID available for voting')
      return false
    }

    // Get the poll to find the event_id
    const { data: poll } = await supabase
      .from('polls')
      .select('event_id')
      .eq('id', pollId)
      .single()

    if (!poll) {
      console.error('Poll not found')
      return false
    }

    // Log the data we're trying to insert for debugging
    const voteData = {
      poll_id: pollId,
      option_id: optionId,
      user_id: userId,
      event_id: poll.event_id,
      unique: `${pollId}_${userId}`
    }
    console.log('Attempting to insert vote:', voteData)

    // Try to insert the vote, handling conflicts manually
    const { error } = await supabase
      .from('poll_votes')
      .insert(voteData)

    // If there's a conflict (user already voted), update their vote
    if (error && error.code === '23505') { // Unique constraint violation
      console.log('User already voted, updating their vote...')
      const { error: updateError } = await supabase
        .from('poll_votes')
        .update({
          option_id: optionId,
          unique: `${pollId}_${userId}`
        })
        .eq('poll_id', pollId)
        .eq('user_id', userId)
      
      if (updateError) {
        console.error('Error updating existing vote:', updateError)
        return false
      }
    } else if (error) {
      console.error('Error inserting vote:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return false
    }

    return true
  } catch (error) {
    console.error('Error casting vote:', error)
    return false
  }
}

// Get live results for a poll
export const getPollResults = async (pollId: string): Promise<PollResult[]> => {
  try {
    // First get all votes for this poll
    const { data: votes } = await supabase
      .from('poll_votes')
      .select('option_id')
      .eq('poll_id', pollId)
      .throwOnError()

    // Get the options to map text to results
    const options = await getPollOptions(pollId)
    
    // Count votes per option
    const voteCounts: { [key: string]: number } = {}
    votes?.forEach(vote => {
      voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1
    })
    
    const totalVotes = Object.values(voteCounts).reduce((sum: number, count: number) => sum + count, 0)

    return options.map(option => {
      const voteCount = voteCounts[option.id] || 0
      const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0

      return {
        option_id: option.id,
        option_text: option.label,
        vote_count: voteCount,
        percentage
      }
    })
  } catch (error) {
    console.error('Error fetching poll results:', error)
    return []
  }
}

// Get live results for a poll using existing options (prevents duplicate API calls)
export const getPollResultsWithOptions = async (pollId: string, options: PollOption[]): Promise<PollResult[]> => {
  try {
    // First get all votes for this poll
    const { data: votes } = await supabase
      .from('poll_votes')
      .select('option_id')
      .eq('poll_id', pollId)
      .throwOnError()
    
    // Count votes per option
    const voteCounts: { [key: string]: number } = {}
    votes?.forEach(vote => {
      voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1
    })
    
    const totalVotes = Object.values(voteCounts).reduce((sum: number, count: number) => sum + count, 0)

    return options.map(option => {
      const voteCount = voteCounts[option.id] || 0
      const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0

      return {
        option_id: option.id,
        option_text: option.label,
        vote_count: voteCount,
        percentage
      }
    })
  } catch (error) {
    console.error('Error fetching poll results with options:', error)
    return []
  }
}

// Create poll options for a poll
export const createPollOptions = async (
  pollId: string,
  options: string[]
): Promise<boolean> => {
  try {
    console.log('Creating poll options for poll:', pollId)
    console.log('Options to insert:', options)
    
    // First, check if the table exists by trying to select from it
    const { error: tableCheckError } = await supabase
      .from('poll_options')
      .select('count')
      .limit(1)
    
    if (tableCheckError) {
      console.error('Table check failed - poll_options table might not exist:', tableCheckError)
      return false
    }
    
    console.log('Table exists, attempting to insert options...')
    
    const { data, error } = await supabase
      .from('poll_options')
      .insert(options.map((text, i) => ({
        poll_id: pollId,
        label: text,
        position: i,
        unique: text.trim().toLowerCase().replace(/\s+/g, '_')
      })))
      .select()
    
    if (error) {
      console.error('Error creating poll options:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return false
    }
    
    console.log('Successfully created poll options:', data)
    return true;
  } catch (error) {
    console.error('Unexpected error creating poll options:', error);
    return false;
  }
}

// Subscribe to active poll changes
export const subscribeActivePoll = (
  eventId: string, 
  onChange: (poll: Poll | null) => void
): (() => void) => {
  const channel = supabase
    .channel(`polls:${eventId}`)
    .on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'polls',
        filter: `event_id=eq.${eventId}`
      },
      (payload) => {
        console.log('Poll change:', payload)
        
        if (payload.eventType === 'INSERT' && payload.new.active) {
          // New active poll
          onChange(payload.new as Poll)
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new.active) {
            // Poll activated
            onChange(payload.new as Poll)
          } else {
            // Poll deactivated
            onChange(null)
          }
        } else if (payload.eventType === 'DELETE') {
          // Poll deleted
          onChange(null)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// Subscribe to poll votes for live results
export const subscribePollVotes = (
  pollId: string, 
  onChange: () => void
): (() => void) => {
  const channel = supabase
    .channel(`poll_votes:${pollId}`)
    .on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'poll_votes',
        filter: `poll_id=eq.${pollId}`
      },
      () => {
        // Any change to votes triggers a refresh
        onChange()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// Admin functions
export const createPoll = async (
  question: string,
  type: 'yes_no' | 'multi',
  options: string[],
  eventId: string,
  userId?: string
): Promise<string | null> => {
  try {
    console.log('Creating poll with:', { question, type, options, eventId, userId })
    
    // First, deactivate any existing active polls for this event
    try {
      const { error: deactivateError } = await supabase
        .from('polls')
        .update({ active: false })
        .eq('event_id', eventId)
        .eq('active', true)

      if (deactivateError) {
        console.error('Error deactivating existing polls:', deactivateError)
      } else {
        console.log('Successfully deactivated existing polls for event:', eventId)
      }
    } catch (error) {
      console.error('Error deactivating existing polls:', error)
      // Continue anyway, don't fail the whole operation
    }

    // Create the poll first
    console.log('Creating poll record...')
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .insert({
        question,
        type,
        active: true,
        event_id: eventId,
        created_by: userId,
      })
      .select()
      .single()

    if (pollError || !poll) {
      console.error('Error creating poll:', pollError)
      return null
    }

    console.log('Poll created successfully:', poll.id)

    // Create poll options using the actual database schema
    try {
      console.log('Creating poll options...')
      console.log('Options to insert:', options)
      
      // First, let's test if we can even access the table
      console.log('Testing table access...')
      const { data: testData, error: testError } = await supabase
        .from('poll_options')
        .select('count')
        .limit(1)
      
      console.log('Table test result:', { testData, testError })
      
      if (testError) {
        console.error('Cannot access poll_options table:', testError)
        // Delete the poll if we can't access the options table
        await supabase
          .from('polls')
          .delete()
          .eq('id', poll.id)
        return null
      }
      
      // Prepare options data with proper structure
      const optionsData = options.map((text, i) => ({
        poll_id: poll.id,
        label: text.trim(),
        position: i,
        unique: `${poll.id}_${i}_${text.trim().toLowerCase().replace(/\s+/g, '_')}`
      }))
      
      console.log('About to insert poll options:', optionsData)
      
      const { data: insertedOptions, error: optionsError } = await supabase
        .from('poll_options')
        .insert(optionsData)
        .select()

      if (optionsError) {
        console.error('Error creating poll options:', optionsError)
        console.error('Error details:', {
          message: optionsError.message,
          details: optionsError.details,
          hint: optionsError.hint,
          code: optionsError.code
        })
        // Delete the poll if options creation failed
        await supabase
          .from('polls')
          .delete()
          .eq('id', poll.id)
        return null
      }

      console.log('Poll options created successfully:', insertedOptions)
      console.log('Total options created:', insertedOptions?.length || 0)
      
      // Verify the options were created by fetching them back
      const { data: verifyOptions, error: verifyError } = await supabase
        .from('poll_options')
        .select('*')
        .eq('poll_id', poll.id)
        .order('position', { ascending: true })
      
      if (verifyError) {
        console.error('Error verifying poll options:', verifyError)
      } else {
        console.log('Verified poll options:', verifyOptions)
        console.log('Verified options count:', verifyOptions?.length || 0)
      }
      
      return poll.id
    } catch (optionsError) {
      console.error('Error creating poll options:', optionsError)
      // Delete the poll if options creation failed
      await supabase
        .from('polls')
        .delete()
        .eq('id', poll.id)
      return null
    }
  } catch (e: unknown) {
    console.error('Poll create failed', {
      message: (e as Error)?.message,
      details: (e as { details?: string })?.details,
      hint: (e as { hint?: string })?.hint,
      code: (e as { code?: string })?.code,
    })
    return null
  }
}

export const deactivatePoll = async (pollId: string): Promise<boolean> => {
  try {
    await supabase
      .from('polls')
      .update({ active: false, status: 'ended', ends_at: new Date().toISOString() })
      .eq('id', pollId)
      .throwOnError()

    return true
  } catch (error) {
    console.error('Error deactivating poll:', error)
    return false
  }
}

// Enhanced poll creation with correct answers and timing
export const createTimedPoll = async (
  question: string,
  type: 'yes_no' | 'multi',
  options: string[],
  correctOptionIndex: number,
  durationSeconds: number,
  eventId: string,
  autoStart: boolean = false,
  userId?: string
): Promise<string | null> => {
  try {
    console.log('Creating timed poll with:', { 
      question, type, options, correctOptionIndex, durationSeconds, eventId, autoStart, userId 
    })
    
    // Get next queue position if not auto-starting
    let queuePosition = null
    if (!autoStart) {
      const { data: maxQueue } = await supabase
        .from('polls')
        .select('queue_position')
        .eq('event_id', eventId)
        .eq('status', 'draft')
        .order('queue_position', { ascending: false })
        .limit(1)
        .single()
      
      queuePosition = (maxQueue?.queue_position || 0) + 1
    }

    // If auto-starting, deactivate existing active polls
    if (autoStart) {
      await supabase
        .from('polls')
        .update({ active: false, status: 'ended', ends_at: new Date().toISOString() })
        .eq('event_id', eventId)
        .eq('status', 'active')
    }

    // Create the poll
    const pollData = {
      question,
      type,
      active: autoStart,
      status: autoStart ? 'active' : 'draft',
      event_id: eventId,
      created_by: userId,
      duration_seconds: durationSeconds,
      queue_position: queuePosition,
      auto_start: !autoStart, // If not auto-starting now, it can auto-start later
      starts_at: autoStart ? new Date().toISOString() : null,
      ends_at: autoStart ? new Date(Date.now() + durationSeconds * 1000).toISOString() : null
    }

    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .insert(pollData)
      .select()
      .single()

    if (pollError || !poll) {
      console.error('Error creating poll:', pollError)
      return null
    }

    // Create poll options
    const optionsData = options.map((text, i) => ({
      poll_id: poll.id,
      label: text.trim(),
      position: i,
      unique: `${poll.id}_${i}_${text.trim().toLowerCase().replace(/\s+/g, '_')}`
    }))

    const { data: insertedOptions, error: optionsError } = await supabase
      .from('poll_options')
      .insert(optionsData)
      .select()

    if (optionsError || !insertedOptions) {
      console.error('Error creating poll options:', optionsError)
      await supabase.from('polls').delete().eq('id', poll.id)
      return null
    }

    // Set the correct answer
    const correctOption = insertedOptions[correctOptionIndex]
    if (correctOption) {
      await supabase
        .from('polls')
        .update({ correct_option_id: correctOption.id })
        .eq('id', poll.id)
    }

    console.log('Timed poll created successfully:', poll.id)
    return poll.id
  } catch (error) {
    console.error('Error creating timed poll:', error)
    return null
  }
}

// Get queued polls for an event
export const getQueuedPolls = async (eventId: string): Promise<Poll[]> => {
  try {
    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'draft')
      .order('queue_position', { ascending: true })

    if (error) {
      console.error('Error fetching queued polls:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching queued polls:', error)
    return []
  }
}

// Start the next poll in queue
export const startNextQueuedPoll = async (eventId: string): Promise<boolean> => {
  try {
    // End current active poll
    await supabase
      .from('polls')
      .update({ active: false, status: 'ended', ends_at: new Date().toISOString() })
      .eq('event_id', eventId)
      .eq('status', 'active')

    // Get next queued poll
    const { data: nextPoll } = await supabase
      .from('polls')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'draft')
      .order('queue_position', { ascending: true })
      .limit(1)
      .single()

    if (!nextPoll) {
      console.log('No queued polls to start')
      return false
    }

    // Start the next poll
    const now = new Date()
    const endsAt = new Date(now.getTime() + (nextPoll.duration_seconds || 60) * 1000)

    await supabase
      .from('polls')
      .update({
        active: true,
        status: 'active',
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString()
      })
      .eq('id', nextPoll.id)

    console.log('Started next queued poll:', nextPoll.id)
    return true
  } catch (error) {
    console.error('Error starting next queued poll:', error)
    return false
  }
}

// Check if poll has ended and handle transitions
export const checkPollExpiry = async (eventId: string): Promise<void> => {
  try {
    const now = new Date()
    
    // Get active polls that should have ended
    const { data: expiredPolls } = await supabase
      .from('polls')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'active')
      .not('ends_at', 'is', null)
      .lt('ends_at', now.toISOString())

    if (expiredPolls && expiredPolls.length > 0) {
      // End expired polls
      await supabase
        .from('polls')
        .update({ active: false, status: 'ended' })
        .eq('event_id', eventId)
        .eq('status', 'active')
        .lt('ends_at', now.toISOString())

      // Start next queued poll if auto-start is enabled
      const { data: nextPoll } = await supabase
        .from('polls')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'draft')
        .eq('auto_start', true)
        .order('queue_position', { ascending: true })
        .limit(1)
        .single()

      if (nextPoll) {
        await startNextQueuedPoll(eventId)
      }
    }
  } catch (error) {
    console.error('Error checking poll expiry:', error)
  }
}
