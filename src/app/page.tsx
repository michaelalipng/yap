'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Image from "next/image"
import Link from "next/link"
import { useProfileCompletion } from '@/lib/useProfileCompletion'
import { useVerificationModal } from '@/lib/useVerificationModal'
import ProfileCompletionModal from '@/components/ProfileCompletionModal'
import VerificationRequiredModal from '@/components/VerificationRequiredModal'
import HamburgerMenu from '@/components/HamburgerMenu'
import LoadingSpinner from '@/components/LoadingSpinner'
import { goldplayBlack, gothamUltra } from '@/lib/fonts'

// Helper function to safely extract user name
function getUserName(user: unknown): string {
  if (user && typeof user === 'object' && 'user_metadata' in user) {
    const metadata = (user as { user_metadata?: { first_name?: string; name?: string } }).user_metadata
    return metadata?.first_name || metadata?.name || 'friend'
  }
  return 'friend'
}

export default function Home() {
  const _router = useRouter()
  const { profile, completionStatus, loading } = useProfileCompletion()
  const { isVerificationModalOpen, featureName, hideVerificationModal, showVerificationModal } = useVerificationModal()
  const [showModal, setShowModal] = useState(false)
  const [user, setUser] = useState<unknown>(null)
  const [smileKey, setSmileKey] = useState(0)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    checkUser()
  }, [])

  const refreshSmiles = () => {
    setSmileKey(prev => prev + 1)
  }

  if (loading) {
    return <LoadingSpinner />
  }

  // If user is not logged in, show login/signup options
  if (!user) {
    return (
      <div 
        className="min-h-screen p-6 relative flex flex-col"
        style={{
          backgroundColor: '#0f0f0f'
        }}
      >
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
          <Image
            src="/LogoHalfFix.png"
            alt="YouthHub Logo"
            width={340}
            height={340}
            priority
          />
        </div>
        
        <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className={`${gothamUltra.className} text-6xl sm:text-7xl md:text-8xl text-white leading-tight relative z-20 text-center`}>
              What&apos;s up,<br />
              friend!
            </h1>
          </div>
          
          <div className="relative mb-8 mx-auto w-full flex justify-center">
            <Link href="/login" className="relative block">
              <div 
                className="w-[400px] h-[216px] z-50 hover:opacity-90 transition-opacity cursor-pointer"
                style={{
                  WebkitMask: 'url(/RightBub.svg) no-repeat center',
                  mask: 'url(/RightBub.svg) no-repeat center',
                  backgroundColor: '#FEDC01',
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain'
                }}
              />
              <h2 className={`${goldplayBlack.className} text-2xl text-black leading-tight absolute inset-0 flex items-center justify-center text-center z-50 px-6`} style={{ maxWidth: '400px', left: '50%', transform: 'translateX(-50%) translateY(-10px)' }}>
                Get started!
              </h2>
            </Link>
          </div>
          
          {/* Additional call-to-action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
            <Link 
              href="/login"
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-semibold px-8 py-4 rounded-xl hover:from-yellow-300 hover:to-yellow-400 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              Sign In
            </Link>
            <Link 
              href="/signup"
              className="bg-black/20 backdrop-blur-sm border border-gray-800 text-white font-semibold px-8 py-4 rounded-xl hover:bg-black/30 hover:border-gray-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              Create Account
            </Link>
          </div>
        </div>

        {/* Smile SVG Pile */}
        <div 
          className="fixed bottom-0 left-0 w-full h-64 cursor-pointer z-10 select-none" 
          style={{ marginLeft: '-68px' }}
          onClick={refreshSmiles}
          title="Click to refresh smiles!"
        >
          {[...Array(100)].map((_, i) => (
            <img
              key={`${smileKey}-${i}`}
              src="/Smile.svg"
              alt="Smile"
              className="absolute w-40 h-40 pointer-events-none select-none"
              style={{
                left: `${(i % 15) * 6.67 + Math.random() * 2}%`,
                bottom: `${Math.random() * 32}%`,
                transform: `rotate(${Math.random() * 360}deg)`,
                zIndex: Math.floor(Math.random() * 10),
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none'
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  // If user is logged in but profile is incomplete
  if (!completionStatus.isComplete) {
    return (
      <div 
        className="min-h-screen p-6 relative flex flex-col"
        style={{
          backgroundColor: '#0f0f0f'
        }}
      >
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
          <Image
            src="/LogoHalfFix.png"
            alt="YouthHub Logo"
            width={340}
            height={340}
            priority
          />
        </div>
        <HamburgerMenu profile={profile} isMod={profile?.role === 'mod' || profile?.role === 'speaker'} />
        
        {/* Profile Completion Circle - Added to the right */}
        <div className="absolute top-6 right-6 z-30">
          <Link href="/profile" className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer">
            <span className="text-white text-sm font-semibold">
              {completionStatus.completionPercentage}%
            </span>
            <div className="relative">
              <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#374151"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#FEDC01"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - completionStatus.completionPercentage / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              {/* Profile Icon inside the circle */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </Link>
        </div>
        
        <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className={`${gothamUltra.className} text-6xl sm:text-7xl md:text-8xl text-white leading-tight relative z-20 text-center`}>
              What&apos;s up,<br />
              {profile?.first_name || "friend"}!
            </h1>
          </div>
          
          <div className="relative mb-8 mx-auto w-full flex justify-center">
            <Link href="/chat" className="relative block">
              <div 
                className="z-50 hover:opacity-90 transition-opacity cursor-pointer"
                style={{
                  width: '520px',
                  height: '281px',
                  WebkitMask: 'url(/RightBub.svg) no-repeat center',
                  mask: 'url(/RightBub.svg) no-repeat center',
                  backgroundColor: '#FEDC01',
                  WebkitMaskSize: '520px 281px',
                  maskSize: '520px 281px',
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat'
                }}
              />
              <h2 className={`${goldplayBlack.className} text-2xl text-black leading-tight absolute inset-0 flex items-center justify-center text-center z-50 px-6`} style={{ maxWidth: '400px', left: '50%', transform: 'translateX(-50%) translateY(-10px)' }}>
                Join the chat!
              </h2>
            </Link>
          </div>
          
          {/* Demo: Test Verification Modal */}
          <div className="text-center mt-8">
            <button
              onClick={() => showVerificationModal('the demo feature')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Test Verification Modal
            </button>
          </div>
        </div>

        <ProfileCompletionModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onComplete={() => setShowModal(false)}
        />
        
        {/* Verification Required Modal */}
        <VerificationRequiredModal
          isOpen={isVerificationModalOpen}
          onClose={hideVerificationModal}
          featureName={featureName}
        />
        
        {/* Smile SVG Pile */}
        <div 
          className="fixed bottom-0 left-0 w-full h-64 cursor-pointer z-10 select-none" 
          style={{ marginLeft: '-68px' }}
          onClick={refreshSmiles}
          title="Click to refresh smiles!"
        >
          {[...Array(100)].map((_, i) => (
            <img
              key={`${smileKey}-${i}`}
              src="/Smile.svg"
              alt="Smile"
              className="absolute w-40 h-40 pointer-events-none select-none"
              style={{
                left: `${(i % 15) * 6.67 + Math.random() * 2}%`,
                bottom: `${Math.random() * 32}%`,
                transform: `rotate(${Math.random() * 360}deg)`,
                zIndex: Math.floor(Math.random() * 10),
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none'
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  // If profile is complete, show full dashboard
  return (
    <div 
      className="min-h-screen p-6 relative flex flex-col"
      style={{
        backgroundColor: '#0f0f0f'
      }}
    >
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
        <Image
          src="/LogoHalfFix.png"
          alt="YouthHub Logo"
          width={340}
          height={340}
          priority
        />
      </div>
      <HamburgerMenu profile={profile} isMod={profile?.role === 'mod' || profile?.role === 'speaker'} />
      <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className={`${gothamUltra.className} text-6xl sm:text-7xl md:text-8xl text-white leading-tight relative z-20 text-center`}>
            What&apos;s up,<br />
            {profile?.first_name || "friend"}!
          </h1>
        </div>
        
        <div className="relative mb-9 mx-auto w-full flex justify-center">
          <Link href="/chat" className="relative block">
            <div 
              className="w-[400px] h-[216px] z-50 hover:opacity-90 transition-opacity cursor-pointer"
              style={{
                WebkitMask: 'url(/RightBub.svg) no-repeat center',
                mask: 'url(/RightBub.svg) no-repeat center',
                backgroundColor: '#FEDC01',
                WebkitMaskSize: 'contain',
                maskSize: 'contain'
              }}
            />
            <h2 className={`${goldplayBlack.className} text-2xl text-black leading-tight absolute inset-0 flex items-center justify-center text-center z-50 px-6`} style={{ maxWidth: '400px', left: '50%', transform: 'translateX(-50%) translateY(-10px)' }}>
              Join the chat!
            </h2>
          </Link>
        </div>

        {/* Smile SVG Pile */}
        <div 
          className="fixed bottom-0 left-0 w-full h-64 cursor-pointer z-10 select-none" 
          style={{ marginLeft: '-68px' }}
          onClick={refreshSmiles}
          title="Click to refresh smiles!"
        >
          {[...Array(100)].map((_, i) => (
            <img
              key={`${smileKey}-${i}`}
              src="/Smile.svg"
              alt="Smile"
              className="absolute w-40 h-40 pointer-events-none select-none"
              style={{
                left: `${(i % 15) * 6.67 + Math.random() * 2}%`,
                bottom: `${Math.random() * 32}%`,
                transform: `rotate(${Math.random() * 360}deg)`,
                zIndex: Math.floor(Math.random() * 10),
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
