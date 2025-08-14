'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Image from "next/image"
import { gothamUltra } from '@/lib/fonts'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Allow scrolling on the signup page - we want to see all content
  useEffect(() => {
    // Allow scrolling so users can see the entire signup card
    document.body.style.overflow = 'auto'
    
    // Re-enable scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
  
    // 1. Sign up the user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password
    })
  
    if (signUpError || !signUpData.user) {
      setError(signUpError?.message || 'Sign up failed')
      setLoading(false)
      return
    }
  
    // 2. Immediately sign in (required for RLS to allow insert)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })
  
    if (signInError) {
      if (
        signInError.message.toLowerCase().includes('email not confirmed')
      ) {
        setError(
          'Please check your email to confirm your account before logging in.'
        )
      } else {
        setError(signInError.message || 'Sign in failed')
      }
      setLoading(false)
      return
    }
  
    // 3. Get the authenticated user ID
    const { data: currentUser } = await supabase.auth.getUser()
  
    // 4. Insert profile row using the current user ID
    if (!currentUser.user) {
      setError('Failed to get user information')
      setLoading(false)
      return
    }
    
    const { error: profileError } = await supabase.from('profiles').insert([
      {
        id: currentUser.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        role: 'student',
        verified: false
      }
    ])
  
    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }
  
    router.push('/chat')
  }
  
  return (
    <div 
      className="signup-page-container min-h-screen p-6 relative no-pull-refresh mobile-app-container"
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

      {/* Main content - ensure it's always visible */}
      <div className="signup-form-container max-w-md mx-auto mt-20 relative z-20 pb-8">
        <div className="mb-8 text-center">
          <h1 className={`${gothamUltra.className} text-4xl sm:text-5xl md:text-6xl text-white leading-tight mb-4`}>
            <br />
            <span style={{ color: '#FFFFFF' }}>Join now!</span>
          </h1>
        </div>

        {/* Signup form */}
        <div className="bg-black/20 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-4">
              {/* First and Last Name in same row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    First Name
                  </label>
                  <input
                    className="w-full bg-white/10 border border-gray-700 text-white placeholder-gray-400 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-200"
                    type="text"
                    placeholder="Enter your first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Last Name
                  </label>
                  <input
                    className="w-full bg-white/10 border border-gray-700 text-white placeholder-gray-400 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              
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
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
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
                  <span>Creating Account...</span>
                </div>
              ) : (
                'Start Yapping'
              )}
            </button>
          </form>

          {/* Login link */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Already have an account?{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors duration-200"
              >
                Sign in here
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
