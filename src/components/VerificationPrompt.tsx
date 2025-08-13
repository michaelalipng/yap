'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface VerificationPromptProps {
  isOpen: boolean
  onClose: () => void
  onVerify: () => void
  featureName: string
}

export default function VerificationPrompt({ 
  isOpen, 
  onClose, 
  onVerify, 
  featureName 
}: VerificationPromptProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-center">
            <span>🔒</span>
            <span>Account Verification Required</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              To use <strong>{featureName}</strong>, please verify your account by completing your profile.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800 font-medium mb-2">
                🎉 Complete your profile to unlock:
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Poll voting</li>
                <li>• Emoji reactions</li>
                <li>• Message upvoting</li>
                <li>• Profile badges</li>
                <li>• All community features</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={onVerify}
              className="flex-1"
            >
              Complete Profile
            </Button>
            <Button 
              variant="outline"
              onClick={onClose}
            >
              Maybe Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
