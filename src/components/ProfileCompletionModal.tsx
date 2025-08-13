'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useProfileCompletion } from '@/lib/useProfileCompletion'
import { supabase } from '@/lib/supabaseClient'

interface ProfileCompletionModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

export default function ProfileCompletionModal({ 
  isOpen, 
  onClose, 
  onComplete 
}: ProfileCompletionModalProps) {
  const { profile, completionStatus, refreshProfile, getFieldDisplayName } = useProfileCompletion()
  const [form, setForm] = useState({
    last_name: profile?.last_name || '',
    birthday: profile?.birthday || '',
    school: profile?.school || '',
    phone: profile?.phone || '',
    username: profile?.username || ''
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  if (!isOpen) return null

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!profile) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...form,
          verified: form.last_name && form.birthday && form.school && form.phone ? true : false
        })
        .eq('id', profile.id)

      if (!error) {
        setSaved(true)
        await refreshProfile()
        setTimeout(() => {
          setSaved(false)
          if (onComplete) onComplete()
        }, 2000)
      }
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const getProgressColor = () => {
    if (completionStatus.completionPercentage >= 100) return 'bg-green-500'
    if (completionStatus.completionPercentage >= 75) return 'bg-yellow-500'
    if (completionStatus.completionPercentage >= 50) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Complete Your Profile</span>
            <Badge variant={completionStatus.isComplete ? "default" : "secondary"}>
              {completionStatus.completionPercentage}% Complete
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Profile Completion</span>
              <span>{completionStatus.completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
                style={{ width: `${completionStatus.completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Missing Fields Warning */}
          {completionStatus.missingFields.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800 font-medium mb-2">
                ⚠️ Complete these required fields to unlock all features:
              </p>
              <ul className="text-sm text-yellow-700 space-y-1">
                {completionStatus.missingFields.map(field => (
                  <li key={field} className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    {getFieldDisplayName(field)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Profile Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Enter your last name"
                value={form.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                className={!form.last_name ? 'border-red-300' : ''}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Birthday <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={form.birthday}
                onChange={(e) => handleChange('birthday', e.target.value)}
                className={!form.birthday ? 'border-red-300' : ''}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                School <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Enter your school name"
                value={form.school}
                onChange={(e) => handleChange('school', e.target.value)}
                className={!form.school ? 'border-red-300' : ''}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Enter your phone number"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={!form.phone ? 'border-red-300' : ''}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Username (Optional)
              </label>
              <Input
                placeholder="Choose a username"
                value={form.username}
                onChange={(e) => handleChange('username', e.target.value)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={saving || !form.last_name || !form.birthday || !form.school || !form.phone}
              className="flex-1"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>

          {saved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-green-800 font-medium">✅ Profile saved successfully!</p>
            </div>
          )}

          {/* Feature Benefits */}
          {!completionStatus.isComplete && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800 font-medium mb-2">
                🎉 Complete your profile to unlock:
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Full chat access</li>
                <li>• Poll voting</li>
                <li>• Emoji reactions</li>
                <li>• Profile badges</li>
                <li>• All community features</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
