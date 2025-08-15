'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquare, Link, FileText, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { gothamMedium, gothamBook } from '@/lib/fonts'

interface BannerFormProps {
  onSubmit: (title: string, link: string, bannerType: string, durationMinutes: number, messageText?: string) => void
  onCancel: () => void
}

export default function BannerForm({ onSubmit, onCancel }: BannerFormProps) {
  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const [bannerType, setBannerType] = useState('link') // 'link', 'form', 'message'
  const [messageText, setMessageText] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(1) // Default to 1 minute
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = bannerType === 'message' ? 3 : 3

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim()) {
      const isValid = bannerType === 'message' 
        ? messageText.trim() 
        : bannerType === 'link' 
          ? true 
          : link.trim()
      
      if (isValid) {
        onSubmit(title.trim(), link.trim(), bannerType, durationMinutes, messageText.trim())
      }
    }
  }

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const getLinkPlaceholder = () => {
    switch (bannerType) {
      case 'form':
        return 'forms.google.com/...'
      case 'link':
        return 'example.com'
      default:
        return ''
    }
  }

  const getLinkLabel = () => {
    switch (bannerType) {
      case 'form':
        return 'Form Link'
      case 'link':
        return 'Website Link'
      default:
        return 'Link'
    }
  }

  const getBannerTypeIcon = () => {
    switch (bannerType) {
      case 'form':
        return <FileText className="h-4 w-4" />
      case 'message':
        return <MessageSquare className="h-4 w-4" />
      default:
        return <Link className="h-4 w-4" />
    }
  }

  const renderPage = () => {
    switch (currentPage) {
      case 1:
        return (
          <>
            {/* Title Section */}
            <div className="space-y-3">
              <label className={`${gothamMedium.className} block text-sm font-medium text-gray-300 mb-2`}>
                Banner Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter banner title..."
                className="border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 prevent-zoom"
                required
              />
            </div>

            {/* Banner Type Section */}
            <div className="space-y-3">
              <label className={`${gothamMedium.className} block text-sm font-medium text-gray-300 mb-2`}>
                Banner Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'link', label: 'Website', icon: <Link className="h-4 w-4" /> },
                  { value: 'form', label: 'Form', icon: <FileText className="h-4 w-4" /> },
                  { value: 'message', label: 'Message', icon: <MessageSquare className="h-4 w-4" /> }
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setBannerType(type.value)}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                      bannerType === type.value
                        ? 'border-blue-500 bg-blue-900/20 text-blue-300'
                        : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50 text-gray-300'
                    }`}
                  >
                    {type.icon}
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )

      case 2:
        return (
          <>
            {/* Duration Section */}
            <div className="space-y-3">
              <label className={`${gothamMedium.className} block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2`}>
                <Clock className="h-4 w-4" />
                Duration
              </label>
              <div className="flex gap-2">
                {[1, 2, 3].map((duration) => (
                  <Button
                    key={duration}
                    type="button"
                    variant={durationMinutes === duration ? "default" : "outline"}
                    onClick={() => setDurationMinutes(duration)}
                    className="flex-1"
                  >
                    {duration} min
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Link Section */}
            {bannerType !== 'message' && (
              <div className="space-y-3">
                <label className={`${gothamMedium.className} block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2`}>
                  {getBannerTypeIcon()}
                  {getLinkLabel()}
                </label>
                <Input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder={getLinkPlaceholder()}
                  type="text"
                  className="border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 prevent-zoom"
                  required={bannerType === 'form'}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Just enter the domain (e.g., &quot;example.com&quot; or &quot;forms.google.com&quot;)
                </p>
              </div>
            )}

            {/* Message Section */}
            {bannerType === 'message' && (
              <div className="space-y-3">
                <label className={`${gothamMedium.className} block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2`}>
                  <MessageSquare className="h-4 w-4" />
                  Pre-written Message
                </label>
                <Textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Enter the message to send..."
                  rows={3}
                  className="border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 resize-none prevent-zoom"
                  required
                />
              </div>
            )}
          </>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
              <h3 className={`${gothamMedium.className} text-lg text-white mb-3`}>Review Your Banner</h3>
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-400">Title:</span> <span className="text-white">{title}</span></div>
                <div><span className="text-gray-400">Type:</span> <span className="text-white capitalize">{bannerType}</span></div>
                <div><span className="text-gray-400">Duration:</span> <span className="text-white">{durationMinutes} minute{durationMinutes > 1 ? 's' : ''}</span></div>
                {bannerType !== 'message' && link && (
                  <div><span className="text-gray-400">Link:</span> <span className="text-white">{link}</span></div>
                )}
                {bannerType === 'message' && messageText && (
                  <div><span className="text-gray-400">Message:</span> <span className="text-white">{messageText}</span></div>
                )}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`${gothamBook.className} space-y-6`}>
      {/* Page Content */}
      {renderPage()}
      
      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
          {currentPage > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={prevPage}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {currentPage < totalPages ? (
            <Button
              type="button"
              onClick={nextPage}
              disabled={
                currentPage === 1 && !title.trim() ||
                currentPage === 2 && (
                  bannerType === 'message' ? !messageText.trim() : 
                  bannerType === 'form' ? !link.trim() : false
                )
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={
                !title.trim() || 
                (bannerType === 'message' && !messageText.trim()) ||
                (bannerType === 'form' && !link.trim())
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              Create Banner
            </Button>
          )}
        </div>
      </div>

      {/* Page Indicator */}
      <div className="flex justify-center">
        <div className="flex gap-1">
          {Array.from({ length: totalPages }, (_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i + 1 === currentPage ? 'bg-blue-500' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>
      
      {/* Cancel Button */}
      <div className="flex justify-center pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
