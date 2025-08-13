'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function RoleManager() {
  const [users, setUsers] = useState<{ id: string; first_name?: string; last_name?: string; email?: string; role?: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error: _error } = await supabase
        .from('profiles')
        .select('*')
        .order('first_name', { ascending: true })

      if (data) setUsers(data)
      setLoading(false)
    }

    fetchUsers()
  }, [])

  const handleRoleChange = async (userId: string, newRole: string) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    )
  }

  if (loading) return <LoadingSpinner />

  const roles = ['student', 'verified', 'leader', 'mod', 'speaker']

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <div key={user.id} className="flex items-center justify-between border-b py-2">
          <div>
            <p className="font-semibold">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <select
            value={user.role}
            onChange={(e) => handleRoleChange(user.id, e.target.value)}
            className="border px-2 py-1 rounded text-sm"
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}
