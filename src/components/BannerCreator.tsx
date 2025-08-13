'use client'

import { useState } from 'react'
import { supabase, emojiChannel } from '@/lib/supabaseClient'

export default function BannerCreator() {
  const [message, setMessage] = useState('')
  const [linkType, setLinkType] = useState<'form' | 'external' | 'share'>('form')
  const [linkUrl, setLinkUrl] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(5)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    // Get the currently active event
    const { data: activeEvent } = await supabase
      .from('events')
      .select('*')
      .eq('active', true)
      .single()

    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes)

    const { error } = await supabase.from('chat_banners').insert({
      message,
      link_type: linkType,
      link_url: linkUrl,
      share_message: linkType === 'share' ? shareMessage : null,
      expires_at: expiresAt,
      active: true,
      event_id: activeEvent?.id || null
    })

    setSubmitting(false)

    if (error) {
      setError(error.message)
    } else {
      setMessage('')
      setLinkType('form')
      setLinkUrl('')
      setShareMessage('')
      setDurationMinutes(5)
      
      // Broadcast banner update to all connected users
      emojiChannel.send({
        type: 'broadcast',
        event: 'banner_update',
        payload: { action: 'refresh' },
      })
    }
  }

  return (
    <div className="p-4 border rounded bg-white shadow">
      <h2 className="text-lg font-semibold mb-2">Create Chat Banner</h2>

      <div className="mb-2">
        <label className="block text-sm font-medium">Banner Text</label>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full mt-1 p-2 border rounded"
          placeholder="e.g. Sign up for Baptism!"
        />
      </div>

      <div className="mb-2">
        <label className="block text-sm font-medium">Link Type</label>
        <select
          value={linkType}
          onChange={(e) => setLinkType(e.target.value as 'form' | 'external' | 'share')}
          className="w-full mt-1 p-2 border rounded"
        >
          <option value="form">Form (autofill user info)</option>
          <option value="external">External Link</option>
          <option value="share">Share with Parent</option>
        </select>
      </div>

      <div className="mb-2">
        <label className="block text-sm font-medium">
          {linkType === 'share' ? 'URL to Share' : 'Destination Link'}
        </label>
        <input
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          className="w-full mt-1 p-2 border rounded"
          placeholder="https://..."
        />
      </div>

      {linkType === 'share' && (
        <div className="mb-2">
          <label className="block text-sm font-medium">Prefilled Message</label>
          <textarea
            value={shareMessage}
            onChange={(e) => setShareMessage(e.target.value)}
            className="w-full mt-1 p-2 border rounded"
            placeholder="Here's the link to sign up for camp. It’s $250 and the deadline is May 21st."
          />
        </div>
      )}

      <div className="mb-2">
        <label className="block text-sm font-medium">Duration (minutes)</label>
        <input
          type="number"
          min={1}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
          className="w-full mt-1 p-2 border rounded"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="bg-blue-600 text-white px-4 py-2 rounded w-full"
      >
        {submitting ? 'Submitting...' : 'Push to Chat'}
      </button>

      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
    </div>
  )
}
