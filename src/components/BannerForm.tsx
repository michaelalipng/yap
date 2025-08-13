'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquare, Link, FileText, Clock } from 'lucide-react'
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

  return (
    <form onSubmit={handleSubmit} className={`${gothamBook.className} space-y-6`}>
      {/* Title Section */}
      <div className="space-y-3">
        <label className={`${gothamMedium.className} block text-sm font-medium text-gray-300 mb-2`}>
          Banner Title
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter banner title..."
          className="border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
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
            className="border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
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
            className="border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 resize-none"
            required
          />
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          Cancel
        </Button>
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
      </div>
    </form>
  )
}
