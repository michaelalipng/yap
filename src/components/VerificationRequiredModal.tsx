'use client'

import Link from 'next/link'
import { gothamUltra } from '@/lib/fonts'

interface VerificationRequiredModalProps {
  isOpen: boolean
  onClose: () => void
  featureName?: string
}

export default function VerificationRequiredModal({ 
  isOpen, 
  onClose, 
  featureName = "this feature"
}: VerificationRequiredModalProps) {
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-black/20 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div className="text-center mb-6">
          <h2 className={`${gothamUltra.className} text-2xl text-white mb-2`}>
            Verification Required
          </h2>
          <p className="text-gray-300 text-sm">
            You need to complete your profile to access {featureName}.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Link href="/profile" className="block">
            <button
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-3 px-4 rounded-xl transition-colors duration-200"
              onClick={onClose}
            >
              Complete Profile
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
