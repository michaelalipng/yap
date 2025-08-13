'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

function EmojiReactionsToggle() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('flags')
        .select('*')
        .eq('key', 'reactions_enabled')
        .single()

      if (data) {
        console.log('Initial emoji reactions flag value:', data.value)
        setEnabled(data.value)
      }
    }

    load()

    // Subscribe to real-time changes
    const channel = supabase
      .channel('emoji-toggle-admin')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'flags', filter: 'key=eq.reactions_enabled' },
        (payload) => {
          console.log('Admin: Emoji reactions flag updated:', payload.new.value)
          setEnabled(payload.new.value)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const toggle = async () => {
    const newValue = !enabled
    console.log('Toggling emoji reactions to:', newValue)
    
    const { error } = await supabase
      .from('flags')
      .update({ value: newValue })
      .eq('key', 'reactions_enabled')

    if (error) {
      console.error('Error updating emoji reactions flag:', error)
      return
    }

    setEnabled(newValue)
    console.log('Emoji reactions flag updated successfully')
  }

  return (
    <div className="border rounded p-4">
      <h2 className="font-semibold text-lg mb-2">Floating Emoji Reactions</h2>
      <button
        className={`px-4 py-2 rounded text-white ${enabled ? 'bg-green-600' : 'bg-gray-500'}`}
        onClick={toggle}
      >
        {enabled ? '✅ Reactions Enabled' : 'Turn On Reactions'}
      </button>
    </div>
  )
}

export default EmojiReactionsToggle 