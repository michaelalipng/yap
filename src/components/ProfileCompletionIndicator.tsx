'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useProfileCompletion } from '@/lib/useProfileCompletion'
import { useState } from 'react'
import ProfileCompletionModal from './ProfileCompletionModal'

interface ProfileCompletionIndicatorProps {
  showButton?: boolean
  compact?: boolean
}

export default function ProfileCompletionIndicator({ 
  showButton = false, 
  compact = false 
}: ProfileCompletionIndicatorProps) {
  const { completionStatus, loading } = useProfileCompletion()
  const [showModal, setShowModal] = useState(false)

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-6 w-16 rounded"></div>
  }

  if (completionStatus.isComplete) {
    return (
      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
        ✅ Complete
      </Badge>
    )
  }

  if (compact) {
    return (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
        {completionStatus.completionPercentage}%
      </Badge>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
        {completionStatus.completionPercentage}% Complete
      </Badge>
      {showButton && (
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => setShowModal(true)}
        >
          Complete
        </Button>
      )}
      
      <ProfileCompletionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onComplete={() => setShowModal(false)}
      />
    </div>
  )
}
