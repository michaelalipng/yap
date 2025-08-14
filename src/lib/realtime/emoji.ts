// lib/realtime/emoji.ts
'use client'
import { supabase } from '@/lib/supabaseClient'

type EmojiPayload = {
  emoji: string
  uid?: string
  ts?: number
}

// Global channel cache to reuse connections
const channelCache = new Map<string, any>()

export async function connectEmoji(eventId: string) {
  console.log('Connecting to emoji channel:', eventId)
  
  // Check if channel already exists
  if (channelCache.has(eventId)) {
    console.log('Reusing existing emoji channel:', eventId)
    return channelCache.get(eventId)
  }
  
  const channel = supabase
    .channel(`emoji-${eventId}`)
    .on(
      'broadcast',
      { event: 'emoji' },
      () => {} // No-op listener to ensure channel is active
    )
    .subscribe()
  
  // Cache the channel for reuse
  channelCache.set(eventId, channel)
  
  console.log('Emoji channel connected:', eventId)
  return channel
}

export function onEmoji(eventId: string, cb: (p: EmojiPayload) => void) {
  // Check if channel already exists
  if (channelCache.has(eventId)) {
    console.log('Reusing existing emoji channel for listening:', eventId)
    const existingChannel = channelCache.get(eventId)
    
    // Add the callback to the existing channel
    existingChannel.on(
      'broadcast',
      { event: 'emoji' },
      ({ payload }) => {
        console.log('Emoji received on channel:', eventId, payload)
        cb(payload as EmojiPayload)
      }
    )
    
    return () => {
      console.log('Removing emoji listener from channel:', eventId)
      // Don't remove the channel, just remove the listener
      existingChannel.off('broadcast', { event: 'emoji' })
    }
  }
  
  // Create new channel if none exists
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

  // Cache the channel for reuse
  channelCache.set(eventId, channel)

  return () => {
    console.log('Cleaning up emoji channel:', eventId)
    // Remove from cache and cleanup
    channelCache.delete(eventId)
    supabase.removeChannel(channel)
  }
}

export async function sendEmoji(eventId: string, payload: EmojiPayload) {
  // Get or create channel
  let channel = channelCache.get(eventId)
  
  if (!channel) {
    console.log('Creating new emoji channel for sending:', eventId)
    channel = await connectEmoji(eventId)
  }

  const p = { ...payload, ts: payload.ts ?? Date.now() }
  
  try {
    await channel.send({ type: 'broadcast', event: 'emoji', payload: p })
    console.log('Emoji sent successfully:', p)
  } catch (error) {
    console.error('Error sending emoji:', error)
    
    // If there's an error, try to recreate the channel
    if (channelCache.has(eventId)) {
      channelCache.delete(eventId)
      supabase.removeChannel(channel)
    }
    
    // Create a new channel and retry once
    const newChannel = await connectEmoji(eventId)
    await newChannel.send({ type: 'broadcast', event: 'emoji', payload: p })
  }
  
  // Don't remove the channel - keep it for reuse
}

// Cleanup function to remove all channels (useful for app shutdown)
export function cleanupEmojiChannels() {
  console.log('Cleaning up all emoji channels')
  channelCache.forEach((channel, eventId) => {
    console.log('Removing emoji channel:', eventId)
    supabase.removeChannel(channel)
  })
  channelCache.clear()
}
