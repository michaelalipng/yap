import { useState } from 'react'
import { useProfileCompletion } from './useProfileCompletion'

export function useVerificationModal() {
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false)
  const [featureName, setFeatureName] = useState<string>('this feature')
  const { completionStatus } = useProfileCompletion()

  const showVerificationModal = (feature: string = 'this feature') => {
    setFeatureName(feature)
    setIsVerificationModalOpen(true)
  }

  const hideVerificationModal = () => {
    setIsVerificationModalOpen(false)
  }

  const requireVerification = (feature: string, callback?: () => void) => {
    if (!completionStatus.isComplete) {
      showVerificationModal(feature)
      return false
    }
    
    if (callback) {
      callback()
    }
    return true
  }

  return {
    isVerificationModalOpen,
    featureName,
    showVerificationModal,
    hideVerificationModal,
    requireVerification,
    isVerified: completionStatus.isComplete
  }
}
