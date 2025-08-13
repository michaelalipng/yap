// lib/realtime/emoji.ts
'use client'
import { supabase } from '@/lib/supabaseClient'

type EmojiPayload = {
  emoji: string
  uid?: string
  ts?: number
}

export async function connectEmoji(eventId: string) {
  console.log('Connecting to emoji channel:', eventId)
  
  const channel = supabase
    .channel(`emoji-${eventId}`)
    .on(
      'broadcast',
      { event: 'emoji' },
      () => {} // No-op listener to ensure channel is active
    )
    .subscribe()
  
  console.log('Emoji channel connected:', eventId)
  return channel
}

export function onEmoji(eventId: string, cb: (p: EmojiPayload) => void) {
  const channel = supabase
    .channel(`emoji-${eventId}`)
    .on(
      'broadcast',
      { event: 'emoji' },
      ({ payload }) => {
        console.log('Emoji received on channel:', eventId, payload)
        cb(payload as EmojiPayload)
      }
    )
    .subscribe()

  return () => {
    console.log('Cleaning up emoji channel:', eventId)
    supabase.removeChannel(channel)
  }
}

export async function sendEmoji(eventId: string, payload: EmojiPayload) {
  const channel = supabase
    .channel(`emoji-${eventId}`)
    .on(
      'broadcast',
      { event: 'emoji' },
      () => {} // No-op listener to ensure channel is active
    )
    .subscribe()

  const p = { ...payload, ts: payload.ts ?? Date.now() }
  await channel.send({ type: 'broadcast', event: 'emoji', payload: p })
  
  // Clean up the channel after sending
  supabase.removeChannel(channel)
}
