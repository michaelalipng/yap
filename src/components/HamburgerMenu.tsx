'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet'
import { supabase } from '@/lib/supabaseClient'
import { gothamUltra, gamilia } from '@/lib/fonts'
import ProfileIcon from '@/components/ProfileIcon'

interface HamburgerMenuProps {
  profile: { id: string; first_name?: string; last_name?: string; role?: string; verified?: boolean; profile_icon?: string } | null
  isMod: boolean
}

export default function HamburgerMenu({ profile, isMod }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setIsOpen(false)
    router.push('/')
  }

  const handlePresenterPageAccess = (path: string) => {
    // Generate a presenter token for the specific page
    const timestamp = Date.now()
    const userHash = profile?.id || 'unknown'
    const roleHash = profile?.role || 'user'
    
    // Create a simple hash-based token (in production, you might want something more secure)
    const token = btoa(`${userHash}:${roleHash}:${timestamp}:presenter`)
      .replace(/[+/=]/g, '') // Remove URL-unsafe characters
      .substring(0, 32) // Limit length
    
    // Navigate to the specific presenter page with the token
    router.push(`${path}?token=${token}`)
    setIsOpen(false)
  }

  return (
    <div className="flex items-center space-x-2">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 p-0 hover:bg-muted/20"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        
        <SheetContent side="left" className="w-80">
          <SheetHeader className="text-left">
            <SheetTitle className={`${gamilia.className} flex items-center gap-3 text-4xl`}>
              <span className="text-yellow-400">
                {profile?.first_name ? profile.first_name : "User"}
              </span>
              <ProfileIcon profileIcon={profile?.profile_icon} className="h-6 w-6 text-white" />
            </SheetTitle>
          </SheetHeader>
          
          <div className={`${gothamUltra.className} mt-8 space-y-3`}>
            <Link 
              href="/" 
              onClick={() => setIsOpen(false)}
              className="block px-3 py-3 text-lg tracking-wide hover:bg-accent hover:text-accent-foreground transition-colors rounded-md"
            >
              HOME
            </Link>
            
            <Link 
              href="/chat" 
              onClick={() => setIsOpen(false)}
              className="block px-3 py-3 text-lg tracking-wide hover:bg-accent hover:text-accent-foreground transition-colors rounded-md"
            >
              CHAT
            </Link>
            
            <Link 
              href="/profile" 
              onClick={() => setIsOpen(false)}
              className="block px-3 py-3 text-lg tracking-wide hover:bg-accent hover:text-accent-foreground transition-colors rounded-md"
            >
              PROFILE
            </Link>
            
            <Link 
              href="/polls" 
              onClick={() => setIsOpen(false)}
              className="block px-3 py-3 text-lg tracking-wide hover:bg-accent hover:text-accent-foreground transition-colors rounded-md"
            >
              POLLS
            </Link>
            
            {isMod && (
              <>
                <button
                  onClick={() => handlePresenterPageAccess('/presenter/chat')}
                  className="block px-3 py-3 text-lg tracking-wide hover:bg-accent hover:text-accent-foreground transition-colors rounded-md w-full text-left"
                >
                  CHAT MONITOR
                </button>
                <button
                  onClick={() => handlePresenterPageAccess('/presenter/poll')}
                  className="block px-3 py-3 text-lg tracking-wide hover:bg-accent hover:text-accent-foreground transition-colors rounded-md w-full text-left"
                >
                  POLL MONITOR
                </button>
                <button
                  onClick={() => handlePresenterPageAccess('/presenter/emoji')}
                  className="block px-3 py-3 text-lg tracking-wide hover:bg-accent hover:text-accent-foreground transition-colors rounded-md w-full text-left"
                >
                  EMOJI MONITOR
                </button>
              </>
            )}
            
            <button
              onClick={handleSignOut}
              className="block px-3 py-3 text-lg tracking-wide hover:bg-accent hover:text-accent-foreground transition-colors rounded-md w-full text-left"
            >
              SIGN OUT
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
