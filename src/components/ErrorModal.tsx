'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { gothamUltra } from '@/lib/fonts'

interface ErrorModalProps {
  isOpen: boolean
  onClose: () => void
  onRetry?: () => void
  title?: string
  message?: string
  error?: Error | null
}

export default function ErrorModal({ 
  isOpen, 
  onClose, 
  onRetry,
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  error
}: ErrorModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-700">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className={`${gothamUltra.className} text-2xl text-white`}>
            {title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6 text-center">
          <div className="space-y-4">
            <p className="text-gray-300 text-lg">
              {message}
            </p>
            
            {error && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
                <p className="text-red-300 text-xs font-mono break-all">
                  {error.message || 'Unknown error'}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            {onRetry && (
              <Button 
                onClick={onRetry}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Close
            </Button>
          </div>

          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
            <p className="text-blue-300 text-sm font-medium mb-2">
              💡 Tips to resolve this:
            </p>
            <ul className="text-blue-400 text-xs space-y-1 text-left">
              <li>• Check your internet connection</li>
              <li>• Refresh the page and try again</li>
              <li>• Make sure you&apos;re logged in</li>
              <li>• Contact support if the problem persists</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
