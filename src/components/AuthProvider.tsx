'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  const router = useRouter()

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get current session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setError(sessionError.message)
          setLoading(false)
          return
        }

        if (currentSession) {
          setSession(currentSession)
          setUser(currentSession.user)
          setIsAuthenticated(true)
          
          // Check if session is expired or about to expire
          const expiresAt = currentSession.expires_at
          if (expiresAt) {
            const now = Math.floor(Date.now() / 1000)
            const timeUntilExpiry = expiresAt - now
            
            // If session expires in less than 1 hour, refresh it
            if (timeUntilExpiry < 3600) {
              console.log('Session expiring soon, refreshing...')
              await refreshSession()
            }
          }
        } else {
          setSession(null)
          setUser(null)
          setIsAuthenticated(false)
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
        setError(err instanceof Error ? err.message : 'Authentication error')
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  // Refresh session
  const refreshSession = async () => {
    try {
      console.log('Refreshing session...')
      const { data: { session: newSession }, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Session refresh error:', error)
        setError(error.message)
        
        // If refresh fails, try to get user again
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!currentUser) {
          // User is truly logged out
          setUser(null)
          setSession(null)
          setIsAuthenticated(false)
          router.push('/login')
        }
        return
      }

      if (newSession) {
        setSession(newSession)
        setUser(newSession.user)
        setIsAuthenticated(true)
        setError(null)
        console.log('Session refreshed successfully')
      }
    } catch (err) {
      console.error('Session refresh error:', err)
      setError(err instanceof Error ? err.message : 'Session refresh failed')
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true)
      await supabase.auth.signOut()
      
      // Clear local state
      setUser(null)
      setSession(null)
      setIsAuthenticated(false)
      setError(null)
      
      // Clear any stored data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token')
        sessionStorage.clear()
      }
      
      // Redirect to login
      router.push('/login')
    } catch (err) {
      console.error('Sign out error:', err)
      setError(err instanceof Error ? err.message : 'Sign out failed')
    } finally {
      setLoading(false)
    }
  }

  // Set up auth state change listener
  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id)
        
        switch (event) {
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
            setSession(session)
            setUser(session?.user || null)
            setIsAuthenticated(!!session)
            setError(null)
            setLoading(false)
            break
            
          case 'SIGNED_OUT':
            setSession(null)
            setUser(null)
            setIsAuthenticated(false)
            setError(null)
            setLoading(false)
            router.push('/login')
            break
            
          case 'USER_UPDATED':
            if (session) {
              setUser(session.user)
              setSession(session)
            }
            break
            
          case 'USER_UPDATED':
            if (session) {
              setUser(session.user)
              setSession(session)
            }
            break
            
          case 'MFA_CHALLENGE_VERIFIED':
            // Handle MFA if needed
            break
            
          default:
            console.log('Unhandled auth event:', event)
        }
      }
    )

    // Set up automatic session refresh
    const refreshInterval = setInterval(async () => {
      if (isAuthenticated) {
        await refreshSession()
      }
    }, 23 * 60 * 60 * 1000) // 23 hours

    // Cleanup function
    return () => {
      subscription.unsubscribe()
      clearInterval(refreshInterval)
    }
  }, [isAuthenticated, router])

  // Set up visibility change listener for when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && isAuthenticated) {
        // User returned to tab, check session
        console.log('User returned to tab, checking session...')
        await refreshSession()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Set up focus listener for when user returns to window
    const handleFocus = async () => {
      if (isAuthenticated) {
        console.log('Window focused, checking session...')
        await refreshSession()
      }
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [isAuthenticated])

  // Set up beforeunload listener to save session state
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (session) {
        // Save current session timestamp
        localStorage.setItem('youthhub.lastActivity', Date.now().toString())
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [session])

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    signOut,
    refreshSession,
    isAuthenticated
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
