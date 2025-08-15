'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { gothamMedium, gothamUltra } from '@/lib/fonts'

interface PollTimerProps {
  endsAt: string
  onExpire?: () => void
  className?: string
}

export default function PollTimer({ endsAt, onExpire, className = '' }: PollTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    minutes: number
    seconds: number
    total: number
  }>({ minutes: 0, seconds: 0, total: 0 })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const endTime = new Date(endsAt).getTime()
      const difference = endTime - now

      if (difference > 0) {
        const minutes = Math.floor(difference / (1000 * 60))
        const seconds = Math.floor((difference % (1000 * 60)) / 1000)
        
        setTimeLeft({
          minutes,
          seconds,
          total: difference
        })
      } else {
        setTimeLeft({ minutes: 0, seconds: 0, total: 0 })
        onExpire?.()
      }
    }

    // Calculate immediately
    calculateTimeLeft()

    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [endsAt, onExpire])

  const getTimerColor = () => {
    if (timeLeft.total <= 30000) return 'text-red-500' // Last 30 seconds
    if (timeLeft.total <= 60000) return 'text-orange-500' // Last minute
    return 'text-green-500' // More than a minute
  }

  const getBackgroundColor = () => {
    if (timeLeft.total <= 30000) return 'bg-red-500/20 border-red-500/50' // Last 30 seconds
    if (timeLeft.total <= 60000) return 'bg-orange-500/20 border-orange-500/50' // Last minute
    return 'bg-green-500/20 border-green-500/50' // More than a minute
  }

  const formatTime = (num: number) => num.toString().padStart(2, '0')

  if (timeLeft.total <= 0) {
    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/50 ${className}`}>
        <Clock className="h-4 w-4 text-red-500" />
        <span className={`${gothamMedium.className} text-red-500 font-semibold`}>
          Poll Ended
        </span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${getBackgroundColor()} ${className}`}>
      <Clock className={`h-4 w-4 ${getTimerColor()}`} />
      <span className={`${gothamUltra.className} ${getTimerColor()} font-bold text-lg`}>
        {formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
      </span>
      <span className={`${gothamMedium.className} ${getTimerColor()} text-sm`}>
        left
      </span>
    </div>
  )
}
