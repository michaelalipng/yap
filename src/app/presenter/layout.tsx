'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import HamburgerMenu from '@/components/HamburgerMenu'

export default function PresenterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [profile, setProfile] = useState<{ id: string; first_name?: string; last_name?: string; role?: string } | null>(null)
  const [isMod, setIsMod] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (profileData) {
          setProfile(profileData)
          setIsMod(profileData.role === 'mod')
        }
      }
    } catch (error) {
      console.error('Error checking user:', error)
    }
  }

  if (!mounted) {
    return (
      <div className="presenter-layout">
        <div className="min-h-screen bg-black text-white p-8">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Loading...</h1>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="presenter-layout">
      {/* Hamburger Menu - Top Left */}
      <div className="absolute top-4 left-4 z-50">
        <HamburgerMenu profile={profile} isMod={isMod} />
      </div>
      
      {children}
    </div>
  )
}
