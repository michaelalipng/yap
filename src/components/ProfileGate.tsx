'use client'

import { ReactNode, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useProfileCompletion } from '@/lib/useProfileCompletion'
import ProfileCompletionModal from './ProfileCompletionModal'

interface ProfileGateProps {
  children: ReactNode
  featureName?: string
  showPreview?: boolean
  previewContent?: ReactNode
  requiredCompletion?: number // Percentage required (default 100)
}

export default function ProfileGate({ 
  children, 
  featureName = "this feature",
  showPreview = true,
  previewContent,
  requiredCompletion = 100
}: ProfileGateProps) {
  const { completionStatus, loading } = useProfileCompletion()
  const [showModal, setShowModal] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const isAccessible = completionStatus.completionPercentage >= requiredCompletion

  if (isAccessible) {
    return <>{children}</>
  }

  if (!showPreview) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-lg font-semibold mb-2">Profile Required</h3>
            <p className="text-muted-foreground mb-4">
              Complete your profile to access {featureName}
            </p>
            <Button onClick={() => setShowModal(true)}>
              Complete Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      {/* Preview with overlay */}
      <div className="relative">
        {/* Preview content */}
        <div className="opacity-50 pointer-events-none">
          {previewContent || children}
        </div>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-center">
                <span>🔒</span>
                <span>Complete Profile to Unlock</span>
                <Badge variant="secondary">
                  {completionStatus.completionPercentage}% Complete
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Complete your profile to access {featureName} and unlock all community features.
                </p>
                
                {/* Progress indicator */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span>Profile Completion</span>
                    <span>{completionStatus.completionPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${completionStatus.completionPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Missing fields */}
                {completionStatus.missingFields.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800 font-medium mb-2">
                      Missing required fields:
                    </p>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {completionStatus.missingFields.slice(0, 3).map(field => (
                        <li key={field} className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                          {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </li>
                      ))}
                      {completionStatus.missingFields.length > 3 && (
                        <li className="text-yellow-600">
                          +{completionStatus.missingFields.length - 3} more...
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={() => setShowModal(true)}
                  className="flex-1"
                >
                  Complete Profile
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/profile'}
                >
                  View Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Profile completion modal */}
      <ProfileCompletionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onComplete={() => setShowModal(false)}
      />
    </>
  )
}
