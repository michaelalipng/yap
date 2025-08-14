'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Image from "next/image"
import { dotemp, gothamMedium, gothamBook, oldEnglishGothic } from '@/lib/fonts'
import { 
  Bird, Bug, Cat, Dog, Fish, Panda, Rabbit, Rat, Shrimp, Turtle, Squirrel, Snail,
  Egg, Apple, Bean, Candy, Carrot, Citrus, Grape, Croissant, Hamburger, Pizza, Sandwich, Cookie
} from 'lucide-react'
import LoadingSpinner from '@/components/LoadingSpinner'
import HamburgerMenu from '@/components/HamburgerMenu'

export default function ProfilePage() {
  // Prevent any scrolling on the page
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    
    return () => {
      document.body.style.overflow = 'unset'
      document.documentElement.style.overflow = 'unset'
    }
  }, [])
  
  const router = useRouter()
  const [profile, setProfile] = useState<{ id: string; first_name?: string; last_name?: string; email?: string; birthday?: string; school?: string; phone?: string; profile_icon?: string; role?: string; verified?: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    birthday: '',
    school: '',
    phone: '',
    profile_icon: 'Dog', // Default profile icon
    confirmPassword: '' // Added for password confirmation
  })
  const [_saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [_showConfetti, setShowConfetti] = useState(false)
  const [showPasswordFields, setShowPasswordFields] = useState(false)

  // Password validation functions
  const hasCapitalLetter = (password: string) => /[A-Z]/.test(password)
  const hasNumber = (password: string) => /[0-9]/.test(password)
  const passwordsMatch = form.password === form.confirmPassword

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // First, let's check what columns exist in the profiles table
      console.log('Checking profiles table schema...')
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error loading profile:', profileError)
        setError('Failed to load profile')
        setLoading(false)
        return
      }

      if (profileData) {
        console.log('Current profile data:', profileData)
        console.log('Available columns:', Object.keys(profileData))
        
        setProfile(profileData)
        setForm({
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          email: profileData.email || '',
          password: '', // Password is not stored in the profiles table, so it's empty
          birthday: profileData.birthday || '',
          school: profileData.school || '',
          phone: profileData.phone || '',
          profile_icon: profileData.profile_icon || 'Dog',
          confirmPassword: '' // Initialize confirmPassword
        })
      }

      setLoading(false)
    }

    init()
  }, [router])

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('') // Clear any previous errors
  }

  const handleSave = async () => {
    if (!profile?.id) {
      setError('No profile found')
      return
    }

    // Check if all required fields are filled
    const allFieldsFilled = form.first_name && form.last_name && form.birthday && form.school && form.phone
    
    if (!allFieldsFilled) {
      setError('Please fill in all required fields')
      return
    }

    // Check if password and confirm password match (if password is provided)
    if (form.password && form.password !== form.confirmPassword) {
      setError('Password and confirm password do not match')
      return
    }

    // Check password strength if password is provided
    if (form.password && (!hasCapitalLetter(form.password) || !hasNumber(form.password))) {
      setError('Password must contain at least one capital letter and one number')
      return
    }

    setSaving(true)
    setError('')

    try {
      console.log('Updating profile for user:', profile.id)
      console.log('Form data:', form)
      
      // Handle email update if changed
      if (form.email && form.email !== profile.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: form.email
        })
        if (emailError) {
          setError('Failed to update email: ' + emailError.message)
          setSaving(false)
          return
        }
      }

      // Handle password update if provided
      if (form.password) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: form.password
        })
        if (passwordError) {
          setError('Failed to update password: ' + passwordError.message)
          setSaving(false)
          return
        }
      }
      
      // Update the profile with all form data and set verified to true
      // Only include fields that exist in the current schema
      const updateData: { [key: string]: string | boolean | Date } = {
        verified: true
      }
      
      // Only add fields if they have values
      if (form.first_name) updateData.first_name = form.first_name
      if (form.last_name) updateData.last_name = form.last_name
      if (form.birthday) updateData.birthday = form.birthday
      if (form.school) updateData.school = form.school
      if (form.phone) updateData.phone = form.phone
      if (form.profile_icon) updateData.profile_icon = form.profile_icon
      
      console.log('Update data being sent:', updateData)
      
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id)
        .select()

      console.log('Update result:', { data, error: updateError })

      if (updateError) {
        console.error('Error updating profile:', updateError)
        setError('Failed to save profile: ' + updateError.message)
        return
      }

      // Update local state
                      setProfile((prev) => prev ? ({
          ...prev,
          ...form,
          verified: true
        }) : null)

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)

      // Show confetti animation
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2000)

      // Show success message and redirect after a short delay
      setTimeout(() => {
        router.push('/chat')
      }, 2000)

    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div 
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={{
        backgroundColor: '#0f0f0f'
      }}
    >
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pb-4 border-b border-gray-800 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <HamburgerMenu profile={profile} isMod={profile?.role === 'mod' || profile?.role === 'speaker'} />
        </div>
        
        {/* Logo */}
        <div className="flex items-center">
          <Image
            src="/LogoHalfFix.png"
            alt="YouthHub Logo"
            width={80}
            height={80}
            priority
          />
        </div>
      </div>

      {/* Main content - no scrolling, always fits content */}
      <div className="flex-1 flex items-center justify-center p-6 pt-16">
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="text-center mb-4">
            <h1 className={`${profile?.verified ? dotemp.className : oldEnglishGothic.className} text-2xl sm:text-3xl md:text-4xl leading-tight mb-2`}>
              <span style={{ color: profile?.verified ? '#FFFFFF' : '#FCD34D' }}>
                {profile?.verified ? 'Your Profile' : 'Profile Incomplete'}
              </span>
            </h1>
            {!profile?.verified && (
              <p className={`${gothamBook.className} text-white text-sm mb-2`}>
                Complete your profile to unlock all features.
              </p>
            )}
          </div>

          {/* Form - no card, just clean layout */}
          <div className={`${gothamBook.className} space-y-3`}>
            <h2 className={`${gothamMedium.className} text-lg font-semibold text-white mb-4`}>Update Info</h2>
            
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 mb-4">
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              {/* First and Last Name - Side by side with better mobile spacing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`${gothamMedium.className} block text-sm font-medium text-gray-300 mb-1`}>
                    First Name
                  </label>
                  <input
                    className="w-full bg-white/10 border border-gray-700 text-white placeholder-gray-400 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-200 text-sm"
                    placeholder="Enter your first name"
                    value={form.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className={`${gothamMedium.className} block text-sm font-medium text-gray-300 mb-1`}>
                    Last Name
                  </label>
                  <input
                    className="w-full bg-white/10 border border-gray-700 text-white placeholder-gray-400 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-200 text-sm"
                    placeholder="Enter your last name"
                    value={form.last_name}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                  />
                </div>
              </div>

              {/* Birthday and School - Side by side with better mobile spacing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`${gothamMedium.className} block text-sm font-medium text-gray-300 mb-1`}>
                    Birthday
                  </label>
                  <input
                    className="w-full max-w-full bg-white/10 border border-gray-700 text-white placeholder-gray-400 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-200 text-sm"
                    type="date"
                    value={form.birthday}
                    onChange={(e) => handleChange('birthday', e.target.value)}
                    style={{ minWidth: '0', maxWidth: '100%' }}
                  />
                </div>
                
                <div>
                  <label className={`${gothamMedium.className} block text-sm font-medium text-gray-300 mb-1`}>
                    School
                  </label>
                  <input
                    className="w-full bg-white/10 border border-gray-700 text-white placeholder-gray-400 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-200 text-sm"
                    placeholder="Enter your school name"
                    value={form.school}
                    onChange={(e) => handleChange('school', e.target.value)}
                  />
                </div>
              </div>

              {/* Email and Phone - Side by side with better mobile spacing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`${gothamMedium.className} block text-sm font-medium text-gray-300 mb-1`}>
                    Email
                  </label>
                  <input
                    className="w-full bg-white/10 border border-gray-700 text-white placeholder-gray-400 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-200 text-sm"
                    type="email"
                    placeholder="Enter your email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className={`${gothamMedium.className} block text-sm font-medium text-gray-300 mb-1`}>
                    Phone Number
                  </label>
                  <input
                    className="w-full bg-white/10 border border-gray-700 text-white placeholder-gray-400 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-200 text-sm"
                    placeholder="Enter your phone number"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                  />
                </div>
              </div>

              {/* Profile Icon Picker */}
              <div>
                <label className={`${gothamMedium.className} block text-sm font-medium text-gray-300 mb-2`}>
                  Profile Icon
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                  {[
                    { name: 'Bird', icon: Bird },
                    { name: 'Bug', icon: Bug },
                    { name: 'Cat', icon: Cat },
                    { name: 'Dog', icon: Dog },
                    { name: 'Fish', icon: Fish },
                    { name: 'Panda', icon: Panda },
                    { name: 'Rabbit', icon: Rabbit },
                    { name: 'Rat', icon: Rat },
                    { name: 'Shrimp', icon: Shrimp },
                    { name: 'Turtle', icon: Turtle },
                    { name: 'Squirrel', icon: Squirrel },
                    { name: 'Snail', icon: Snail },
                    { name: 'Egg', icon: Egg },
                    { name: 'Apple', icon: Apple },
                    { name: 'Bean', icon: Bean },
                    { name: 'Candy', icon: Candy },
                    { name: 'Carrot', icon: Carrot },
                    { name: 'Citrus', icon: Citrus },
                    { name: 'Grape', icon: Grape },
                    { name: 'Croissant', icon: Croissant },
                    { name: 'Hamburger', icon: Hamburger },
                    { name: 'Pizza', icon: Pizza },
                    { name: 'Sandwich', icon: Sandwich },
                    { name: 'Cookie', icon: Cookie }
                  ].map(({ name, icon: IconComponent }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleChange('profile_icon', name)}
                      className={`h-10 w-10 p-2 rounded-lg transition-all duration-200 flex items-center justify-center ${
                        form.profile_icon === name
                          ? 'bg-yellow-500 text-white ring-2 ring-yellow-400'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                      }`}
                      title={name}
                    >
                      <IconComponent className="h-5 w-5" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Change Password Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowPasswordFields(!showPasswordFields)}
                  className={`${gothamMedium.className} text-yellow-400 hover:text-yellow-300 text-sm font-medium transition-colors duration-200`}
                >
                  {showPasswordFields ? 'Hide Password Fields' : 'Change Password'}
                </button>
              </div>

              {/* Password Fields - Conditionally shown */}
              {showPasswordFields && (
                <>
                  {/* Password - Full width */}
                  <div>
                    <label className={`${gothamMedium.className} block text-sm font-medium text-gray-300 mb-1`}>
                      Password
                    </label>
                    <input
                      className="w-full bg-white/10 border border-gray-700 text-white placeholder-gray-400 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-200 text-sm"
                      type="password"
                      placeholder="Enter new password"
                      value={form.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                    />
                    {/* Password strength indicators */}
                    {form.password && (
                      <div className="mt-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${hasCapitalLetter(form.password) ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                          <span className={`text-xs ${hasCapitalLetter(form.password) ? 'text-green-400' : 'text-gray-400'}`}>
                            Capital letter
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${hasNumber(form.password) ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                          <span className={`text-xs ${hasNumber(form.password) ? 'text-green-400' : 'text-gray-400'}`}>
                            Number
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password - Full width */}
                  <div>
                    <label className={`${gothamMedium.className} block text-sm font-medium text-gray-300 mb-1`}>
                      Confirm Password
                    </label>
                    <input
                      className={`w-full bg-white/10 border px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-200 text-sm ${
                        form.confirmPassword 
                          ? passwordsMatch 
                            ? 'border-green-500 text-white placeholder-gray-400' 
                            : 'border-red-500 text-white placeholder-gray-400'
                          : 'border-gray-700 text-white placeholder-gray-400'
                      }`}
                      type="password"
                      placeholder="Confirm new password"
                      value={form.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    />
                    {/* Password match indicator */}
                    {form.confirmPassword && (
                                              <div className="mt-1 flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${passwordsMatch ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <span className={`text-xs ${passwordsMatch ? 'text-green-400' : 'text-red-400'}`}>
                          Passwords match
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Save Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className={`${gothamMedium.className} w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}