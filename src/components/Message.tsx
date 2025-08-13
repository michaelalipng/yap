'use client'

import { useState, useRef, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, X, Pin, Star, Trash2, Clock } from 'lucide-react'
import { gothamMedium, gothamBook, oldEnglishGothic } from '@/lib/fonts'
import ProfileIcon from './ProfileIcon'

interface MessageProps {
  id: string
  content: string
  userId: string
  userName: string
  userRole: string
  userScore: number
  profileIcon?: string
  createdAt: string
  approved: boolean
  denied: boolean
  starred: boolean
  pinned: boolean
  isMod: boolean
  upvoteCount?: number
  userHasUpvoted?: boolean
  hasActiveEvent?: boolean
  isOwnMessage: boolean
  textSize?: 'sm' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
  onModeration: (messageId: string, action: 'approve' | 'deny' | 'star' | 'unstar' | 'pin' | 'unpin') => void
  onUpvote?: (messageId: string) => void
}

export default function Message({
  id,
  content,
  userId,
  userName,
  userRole,
  userScore,
  profileIcon,
  createdAt,
  approved,
  denied,
  starred,
  pinned,
  isMod,
  upvoteCount = 0,
  userHasUpvoted = false,
  hasActiveEvent = true,
  isOwnMessage,
  textSize = 'sm',
  onModeration,
  onUpvote
}: MessageProps) {
  const [_isHovered, setIsHovered] = useState(false)
  const [isStarBursting, setIsStarBursting] = useState(false)
  const [_showModControls, setShowModControls] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const messageRef = useRef<HTMLDivElement>(null)

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getUserFlair = () => {
    // userScore is star_count * 100, so we need to divide by 100 to get the actual star count
    const starCount = userScore / 100
    
    if (starCount >= 50) return 'Champion'
    if (starCount >= 40) return 'Steward'
    if (starCount >= 30) return 'Apostle'
    if (starCount >= 25) return 'Elder'
    if (starCount >= 20) return 'Shepherd'
    if (starCount >= 15) return 'Deacon'
    if (starCount >= 10) return 'Israelite'
    if (starCount >= 6) return 'Samaritan'
    if (starCount >= 3) return 'Disciple'
    if (starCount >= 1) return 'Seeker'
    
    return null
  }

  const getFlairColor = () => {
    const starCount = userScore / 100
    
    if (starCount >= 50) return 'text-amber-300' // Champion - subtle gold
    if (starCount >= 40) return 'text-emerald-300' // Steward - subtle green
    if (starCount >= 30) return 'text-purple-300' // Apostle - subtle purple
    if (starCount >= 25) return 'text-blue-300' // Elder - subtle blue
    if (starCount >= 20) return 'text-teal-300' // Shepherd - subtle teal
    if (starCount >= 15) return 'text-indigo-300' // Deacon - subtle indigo
    if (starCount >= 10) return 'text-rose-300' // Israelite - subtle rose
    if (starCount >= 6) return 'text-cyan-300' // Samaritan - subtle cyan
    if (starCount >= 3) return 'text-slate-300' // Disciple - subtle slate
    if (starCount >= 1) return 'text-gray-300' // Seeker - subtle gray
    
    return 'text-gray-400' // Default fallback
  }

  const getRoleBadgeVariant = () => {
    if (userRole === 'admin') return 'default'
    if (userRole === 'moderator') return 'secondary'
    return 'outline'
  }

  const getRoleBadgeColor = () => {
    if (userRole === 'admin') return 'bg-yellow-500 text-yellow-900'
    if (userRole === 'moderator') return 'bg-blue-500 text-blue-900'
    return 'bg-gray-100 text-gray-700'
  }

  const handleStarClick = () => {
    setIsStarBursting(true)
    onModeration(id, starred ? 'unstar' : 'star')
    
    // Reset animation after it completes
    setTimeout(() => {
      setIsStarBursting(false)
    }, 600)
  }

  const handleLongPressStart = () => {
    if (isMod) {
      longPressTimer.current = setTimeout(() => {
        setShowModControls(true)
      }, 500) // 500ms long press
    }
  }

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleTouchStart = (_e: React.TouchEvent) => {
    handleLongPressStart()
  }

  const handleTouchEnd = (_e: React.TouchEvent) => {
    handleLongPressEnd()
  }

  const handleMouseDown = (_e: React.MouseEvent) => {
    handleLongPressStart()
  }

  const handleMouseUp = (_e: React.MouseEvent) => {
    handleLongPressEnd()
  }

  const handleMouseLeave = (_e: React.MouseEvent) => {
    handleLongPressEnd()
  }

  const handleCloseModControls = () => {
    setShowModControls(false)
  }

  // Close mod controls when clicking outside
  const handleContainerClick = (e: React.MouseEvent) => {
    if (_showModControls) {
      e.stopPropagation()
    }
  }

  // Close mod controls when clicking outside the message
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
          if (_showModControls && messageRef.current && !messageRef.current.contains(event.target as Node)) {
      setShowModControls(false)
    }
  }

  if (_showModControls) {
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
  }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [_showModControls])

  // Determine message styling based on approval status
  const getMessageStyling = () => {
    if (denied) {
      return 'opacity-50 bg-red-50 border-l-2 border-l-red-500 pl-3'
    }
    if (pinned) {
      return 'border-l-2 border-l-blue-500 pl-3'
    }
    if (!approved && !denied) {
      return 'opacity-70 text-gray-400'
    }
    return ''
  }

  // Determine if moderation buttons should be visible
  const shouldShowModButtons = isMod && !approved && !denied

  // Regular message - minimal styling
  return (
    <div 
      ref={messageRef}
      className={`${gothamBook.className} py-2 transition-all duration-200 ${getMessageStyling()}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={(e) => {
        setIsHovered(false)
        handleMouseLeave(e)
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={handleContainerClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <ProfileIcon 
              profileIcon={profileIcon} 
              className="h-5 w-5 text-gray-300 flex-shrink-0" 
            />
            <span className={`${gothamMedium.className} font-semibold ${textSize === 'sm' ? 'text-sm' : textSize === 'lg' ? 'text-base' : textSize === 'xl' ? 'text-lg' : textSize === '2xl' ? 'text-xl' : textSize === '3xl' ? 'text-2xl' : 'text-3xl'}`}>{userName}</span>
            
            {/* Simple moderation buttons for pending messages */}
            {shouldShowModButtons && (
              <div className="flex items-center space-x-1 ml-2">
                <button
                  onClick={() => onModeration(id, 'approve')}
                  className="h-5 w-5 p-0 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-colors duration-200"
                  title="Approve Message"
                >
                  <Check className="h-3 w-3" />
                </button>
                
                <button
                  onClick={() => onModeration(id, 'deny')}
                  className="h-5 w-5 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors duration-200"
                  title="Deny Message"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {/* Denied message indicator */}
            {denied && (
              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 text-xs">
                <X className="h-3 w-3 mr-1" />
                Denied
              </Badge>
            )}
            
            {/* Pending approval indicator for sender */}
            {!approved && !denied && isOwnMessage && (
              <Clock className="h-3 w-3 text-blue-400" />
            )}
            
            {(userRole === 'admin' || userRole === 'moderator') && (
              <Badge variant={getRoleBadgeVariant()} className={`text-xs ${getRoleBadgeColor()}`}>
                {userRole}
              </Badge>
            )}
            
            {/* User flair moved to where time was */}
            {getUserFlair() && (
              <span className={`${oldEnglishGothic.className} text-xs italic ${getFlairColor()}`}>
                {getUserFlair()}
              </span>
            )}
          </div>
          
          <p className={`text-${textSize} leading-relaxed ${starred ? 'text-yellow-400' : ''}`}>{content}</p>
        </div>
        
        <div className="flex items-center space-x-1 ml-3 flex-shrink-0">
          {/* Time display on the right side */}
          <span className={`${gothamBook.className} text-xs text-muted-foreground`}>
            {formatTime(createdAt)}
          </span>
          
          {/* Mod buttons - only show on long press for approved messages */}
                      {isMod && _showModControls && approved && !denied && (
            <>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onModeration(id, 'deny')}
                className="h-6 w-6 p-0"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              
              <Button
                size="sm"
                variant={pinned ? "secondary" : "outline"}
                onClick={() => onModeration(id, pinned ? 'unpin' : 'pin')}
                className="h-6 w-6 p-0"
                title={pinned ? 'Unpin' : 'Pin'}
              >
                <Pin className="h-3 w-3" />
              </Button>
              
              <Button
                size="sm"
                variant={starred ? "secondary" : "outline"}
                onClick={handleStarClick}
                className={`h-6 w-6 p-0 relative overflow-hidden ${
                  isStarBursting ? 'animate-pulse' : ''
                }`}
                title={starred ? 'Unstar' : 'Star'}
              >
                <Star className={`h-3 w-3 transition-all duration-300 ${
                  isStarBursting ? 'scale-150 text-yellow-400' : ''
                }`} />
                
                {/* Burst effect particles */}
                {isStarBursting && (
                  <>
                    <div className="absolute inset-0 animate-ping">
                      <div className="w-full h-full bg-yellow-400 rounded-full opacity-20"></div>
                    </div>
                    <div className="absolute inset-0 animate-ping" style={{ animationDelay: '0.1s' }}>
                      <div className="w-full h-full bg-yellow-300 rounded-full opacity-15"></div>
                    </div>
                    <div className="absolute inset-0 animate-ping" style={{ animationDelay: '0.2s' }}>
                      <div className="w-full h-full bg-yellow-200 rounded-full opacity-10"></div>
                    </div>
                  </>
                )}
              </Button>
              
              {/* Close button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCloseModControls}
                className="h-6 w-6 p-0 ml-2"
                title="Close"
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 