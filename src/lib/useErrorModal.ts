import { useState } from 'react'

interface ErrorModalState {
  isOpen: boolean
  title: string
  message: string
  error: Error | null
  onRetry?: () => void
}

export function useErrorModal() {
  const [errorState, setErrorState] = useState<ErrorModalState>({
    isOpen: false,
    title: "Something went wrong",
    message: "An unexpected error occurred. Please try again.",
    error: null
  })

  const showError = (
    error: Error, 
    title?: string, 
    message?: string, 
    onRetry?: () => void
  ) => {
    setErrorState({
      isOpen: true,
      title: title || "Something went wrong",
      message: message || "An unexpected error occurred. Please try again.",
      error,
      onRetry
    })
  }

  const showPollVoteError = (error: Error, onRetry?: () => void) => {
    showError(
      error,
      "Vote Failed",
      "We couldn't process your vote. This might be due to a network issue or the poll may have ended.",
      onRetry
    )
  }

  const showChatError = (error: Error, onRetry?: () => void) => {
    showError(
      error,
      "Message Failed",
      "We couldn't send your message. Please check your connection and try again.",
      onRetry
    )
  }

  const showProfileError = (error: Error, onRetry?: () => void) => {
    showError(
      error,
      "Profile Update Failed",
      "We couldn't save your profile changes. Please try again.",
      onRetry
    )
  }

  const hideError = () => {
    setErrorState(prev => ({ ...prev, isOpen: false }))
  }

  return {
    ...errorState,
    showError,
    showPollVoteError,
    showChatError,
    showProfileError,
    hideError
  }
}
