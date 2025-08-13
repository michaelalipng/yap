'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function ChatFreezeToggle() {
  const [frozen, setFrozen] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('flags')
        .select('value')
        .eq('key', 'chat_frozen')
        .single()

      if (data) setFrozen(data.value)
    }

    load()
  }, [])

  const toggle = async () => {
    const newValue = !frozen
    await supabase
      .from('flags')
      .update({ value: newValue })
      .eq('key', 'chat_frozen')

    setFrozen(newValue)
  }

  return (
    <div className="border rounded p-4">
      <h2 className="font-semibold text-lg mb-2">Freeze Chat</h2>
      <button
        className={`px-4 py-2 rounded text-white ${frozen ? 'bg-red-600' : 'bg-gray-500'}`}
        onClick={toggle}
      >
        {frozen ? '❄️ Chat is Frozen' : 'Freeze Chat'}
      </button>
    </div>
  )
}
