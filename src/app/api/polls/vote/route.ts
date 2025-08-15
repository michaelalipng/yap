import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request: NextRequest) {
  try {
    const { pollId, optionId, sessionId } = await request.json()

    if (!pollId || !optionId || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get the poll to find the event_id
    const { data: poll } = await supabase
      .from('polls')
      .select('event_id, active')
      .eq('id', pollId)
      .single()

    if (!poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      )
    }

    if (!poll.active) {
      return NextResponse.json(
        { error: 'Poll is not active' },
        { status: 400 }
      )
    }

    // Check if this session has already voted
    const { data: existingVote } = await supabase
      .from('poll_votes')
      .select('id')
      .eq('poll_id', pollId)
      .eq('user_id', sessionId)
      .single()

    if (existingVote) {
      // Update existing vote
      const { error } = await supabase
        .from('poll_votes')
        .update({
          option_id: optionId,
          unique: `${pollId}_${sessionId}`
        })
        .eq('id', existingVote.id)

      if (error) {
        console.error('Error updating vote:', error)
        return NextResponse.json(
          { error: 'Failed to update vote' },
          { status: 500 }
        )
      }
    } else {
      // Insert new vote
      const { error } = await supabase
        .from('poll_votes')
        .insert({
          poll_id: pollId,
          option_id: optionId,
          user_id: sessionId,
          event_id: poll.event_id,
          unique: `${pollId}_${sessionId}`
        })

      if (error) {
        console.error('Error inserting vote:', error)
        return NextResponse.json(
          { error: 'Failed to cast vote' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in vote API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
