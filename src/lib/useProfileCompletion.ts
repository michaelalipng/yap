import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export interface ProfileCompletionStatus {
  isComplete: boolean
  missingFields: string[]
  completionPercentage: number
  requiredFields: string[]
  optionalFields: string[]
}

export interface Profile {
  id: string
  first_name?: string
  last_name?: string
  username?: string
  birthday?: string
  school?: string
  phone?: string
  role?: string
  verified?: boolean
  star_count?: number
  ban_until?: string
}

export function useProfileCompletion() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [completionStatus, setCompletionStatus] = useState<ProfileCompletionStatus>({
    isComplete: false,
    missingFields: [],
    completionPercentage: 0,
    requiredFields: ['last_name', 'birthday', 'school', 'phone'],
    optionalFields: ['username']
  })

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setLoading(false)
          return
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileData) {
          setProfile(profileData)
          calculateCompletionStatus(profileData)
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const calculateCompletionStatus = (profileData: Profile) => {
    const requiredFields = ['last_name', 'birthday', 'school', 'phone']
    const missingFields: string[] = []
    
    requiredFields.forEach(field => {
      if (!profileData[field as keyof Profile] || 
          (typeof profileData[field as keyof Profile] === 'string' && 
           profileData[field as keyof Profile] === '')) {
        missingFields.push(field)
      }
    })

    const completionPercentage = Math.round(((requiredFields.length - missingFields.length) / requiredFields.length) * 100)
    const isComplete = missingFields.length === 0

    setCompletionStatus({
      isComplete,
      missingFields,
      completionPercentage,
      requiredFields,
      optionalFields: ['username']
    })
  }

  const refreshProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        calculateCompletionStatus(profileData)
      }
    } catch (error) {
      console.error('Error refreshing profile:', error)
    }
  }

  const getFieldDisplayName = (field: string): string => {
    const fieldNames: { [key: string]: string } = {
      last_name: 'Last Name',
      birthday: 'Birthday',
      school: 'School',
      phone: 'Phone Number',
      username: 'Username'
    }
    return fieldNames[field] || field
  }

  return {
    profile,
    loading,
    completionStatus,
    refreshProfile,
    getFieldDisplayName
  }
}
