'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import Image from "next/image"
import { gothamUltra } from '@/lib/fonts'

export default function LoginPage() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push('/chat')
    }
  }, [isAuthenticated, authLoading, router])

  // Disable scrolling when component mounts
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    
    // Re-enable scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })

      if (error) {
        setError(error.message)
      } else {
        // Set remember me preference
        if (rememberMe) {
          localStorage.setItem('youthhub.rememberMe', 'true')
          // Extend session duration for remember me users
          await supabase.auth.refreshSession()
        } else {
          localStorage.removeItem('youthhub.rememberMe')
        }
        
        // Save last login timestamp
        localStorage.setItem('youthhub.lastLogin', Date.now().toString())
        
        // Redirect will happen automatically via auth state change
        console.log('Login successful, redirecting...')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  // Show loading spinner while auth is initializing
  if (authLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#0f0f0f' }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen p-6 relative no-pull-refresh mobile-app-container"
      style={{
        backgroundColor: '#0f0f0f'
      }}
    >
      {/* Logo at top */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-30">
        <Image
          src="/LogoHalfFix.png"
          alt="YouthHub Logo"
          width={340}
          height={340}
          priority
        />
      </div>

      {/* Main content */}
      <div className="max-w-md mx-auto mt-20 relative z-20">
        <div className="mb-8 text-center">
          <h1 className={`${gothamUltra.className} text-4xl sm:text-5xl md:text-6xl text-white leading-tight mb-4`}>
            <br />
            <span style={{ color: '#FFFFFF' }}>Welcome back!</span>
          </h1>
        </div>

        {/* Login form */}
        <div className="bg-black/20 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  className="w-full bg-white/10 border border-gray-700 text-white placeholder-gray-400 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-200"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  className="w-full bg-white/10 border border-gray-700 text-white placeholder-gray-400 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-200"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              {/* Remember Me Checkbox */}
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-yellow-400 focus:ring-yellow-400 border-gray-600 rounded bg-white/10"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                  Keep me signed in
                </label>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-semibold px-6 py-4 rounded-xl hover:from-yellow-300 hover:to-yellow-400 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-3"></div>
                  <span>Signing In...</span>
                </div>
              ) : (
                'Get Yapping'
              )}
            </button>
          </form>

          {/* Signup link */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Don&apos;t have an account?{' '}
              <button
                onClick={() => router.push('/signup')}
                className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors duration-200"
              >
                Sign up here
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Three rows of smiles stacked vertically at top */}
      <div className="absolute top-0 left-0 w-full pointer-events-none z-0">
        {/* Row 1 - Top */}
        <div className="flex justify-center space-x-1">
          {[...Array(15)].map((_, i) => (
            <div key={`row1-${i}`} className="w-8 h-8">
              <Image
                src="/Smile.png"
                alt="Smile"
                width={32}
                height={32}
                className="w-full h-full object-contain"
                style={{
                  transform: `rotate(${((i * 7) % 12) * 30}deg)`,
                }}
              />
            </div>
          ))}
        </div>
        
        {/* Row 2 - Middle */}
        <div className="flex justify-center space-x-1 mt-1">
          {[...Array(15)].map((_, i) => (
            <div key={`row2-${i}`} className="w-8 h-8">
              <Image
                src="/Smile.png"
                alt="Smile"
                width={32}
                height={32}
                className="w-full h-full object-contain"
                style={{
                  transform: `rotate(${((i * 11) % 12) * 30}deg)`,
                }}
              />
            </div>
          ))}
        </div>
        
        {/* Row 3 - Bottom */}
        <div className="flex justify-center space-x-1 mt-1">
          {[...Array(15)].map((_, i) => (
            <div key={`row3-${i}`} className="w-8 h-8">
              <Image
                src="/Smile.png"
                alt="Smile"
                width={32}
                height={32}
                className="w-full h-full object-contain"
                style={{
                  transform: `rotate(${((i * 13) % 12) * 30}deg)`,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
