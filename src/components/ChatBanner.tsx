'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Banner = {
  id: string
  message: string
  link_type: 'form' | 'external' | 'share'
  link_url: string
  share_message?: string
  expires_at: string | null
  active: boolean
  event_id: string | null
}

export default function ChatBanner() {
  const [eventId, setEventId] = useState<string | null>(null)
  const [banner, setBanner] = useState<Banner | null>(null)
  const [isExiting, setIsExiting] = useState(false)

  // 1) Fetch active event first
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: event } = await supabase
        .from('events')
        .select('*')
        .eq('active', true)
        .single()
      if (!cancelled) setEventId(event?.id ?? null)
    })()
    return () => { cancelled = true }
  }, [])

  // 2) Initial fetch + realtime subscribe scoped to event
  useEffect(() => {
    if (!eventId) return

    let isMounted = true

    const fetchInitial = async () => {
      const { data } = await supabase
        .from('chat_banners')
        .select('*')
        .eq('event_id', eventId)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (isMounted) {
        if (data) {
          setBanner(data)
          setIsExiting(false)
        } else {
          // No banner - start exit animation if we had one before
          if (banner) {
            setIsExiting(true)
            setTimeout(() => {
              if (isMounted) {
                setBanner(null)
                setIsExiting(false)
              }
            }, 400) // Match bannerSlideOut duration
          }
        }
      }
    }

    fetchInitial()

    const channel = supabase
      .channel(`chat_banners:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_banners',
          filter: `event_id=eq.${eventId}`, // <-- key: filter at the subscription source
        },
        (payload) => {
          const row = payload.new as Banner
          // Keep client-side validity here (don't put it in RLS)
          const stillValid =
            row.active === true &&
            (!row.expires_at || new Date(row.expires_at) > new Date())
          
          if (isMounted) {
            if (stillValid && row) {
              // New banner - show immediately
              setBanner(row)
              setIsExiting(false)
            } else if (banner) {
              // Banner expired/removed - start exit animation
              setIsExiting(true)
              setTimeout(() => {
                if (isMounted) {
                  setBanner(null)
                  setIsExiting(false)
                }
              }, 400) // Match bannerSlideOut duration
            }
          }
        }
      )
      .subscribe((_status) => {
        // optional: console.log('realtime status', _status)
      })

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [eventId, banner])

  if (!banner) return null

  const handleClick = async () => {
    // Track the banner click
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      await supabase.from('chat_banner_clicks').insert({
        user_id: user.id,
        banner_id: banner.id,
      })
    }

    if (banner.link_type === 'share') {
      // More aggressive cleaning - remove ALL whitespace and rebuild
      const message = (banner.share_message || '').replace(/\s/g, ' ').trim()
      const url = banner.link_url
      const text = message && url ? `${message} ${url}` : message || url

      // Try Option A: Native Share Sheet
      if (navigator.share) {
        try {
          await navigator.share({
            text,
          })
        } catch (err) {
          console.warn('Share cancelled or failed, falling back to SMS.', err)
          window.open(`sms:?&body=${encodeURIComponent(text)}`, '_blank')
        }
      } else {
        // Fallback: SMS deep link
        window.open(`sms:?&body=${encodeURIComponent(text)}`, '_blank')
      }
      return
    }

    // Handle form banners with autofill
    if (banner.link_type === 'form') {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single()

      if (!profile) return

      const params = new URLSearchParams({
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
      })

      const prefilledUrl = `${banner.link_url}?${params.toString()}`
      window.open(prefilledUrl, '_blank')
      return
    }

    // Handle external links
    if (banner.link_type === 'external') {
      window.open(banner.link_url, '_blank')
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`group cursor-pointer bg-blue-500/90 backdrop-blur-sm border-2 border-blue-300/50 hover:border-blue-400 hover:bg-blue-500 transition-all duration-200 rounded-full px-6 py-2 shadow-xl hover:shadow-2xl ${
        isExiting 
          ? 'animate-bannerSlideOut' 
          : 'animate-bannerSlideIn animate-bannerPulse animate-bannerGlow'
      }`}
    >
      <div className="text-center">
        <p className="font-semibold text-white text-sm leading-tight drop-shadow-sm">{banner.message}</p>
      </div>
    </div>
  )
}
