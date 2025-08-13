'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { X, Plus, Sparkles } from 'lucide-react'
import { gothamMedium, gothamBook } from '@/lib/fonts'

interface PollFormProps {
  onSubmit: (question: string, options: string[]) => void
  isSubmitting?: boolean
}

export default function PollForm({ onSubmit, isSubmitting = false }: PollFormProps) {
  const [question, setQuestion] = useState('')
  const [isMultipleChoice, setIsMultipleChoice] = useState(false)
  const [options, setOptions] = useState(['Yes', 'No'])
  const [hoveredOption, setHoveredOption] = useState<number | null>(null)
  const [focusedOption, setFocusedOption] = useState<number | null>(null)

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, ''])
    }
  }

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleMultipleChoiceChange = (checked: boolean) => {
    setIsMultipleChoice(checked)
    if (checked) {
      // When enabling multiple choice, allow custom options
      setOptions(['', ''])
    } else {
      // When disabling, revert to Yes/No
      setOptions(['Yes', 'No'])
    }
  }

  // Helper function to get poll type for API
  const _getPollType = (): 'yes_no' | 'multi' => {
    if (options.length === 2 && options[0] === 'Yes' && options[1] === 'No') {
      return 'yes_no'
    }
    return 'multi'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validOptions = options.filter(opt => opt.trim())
    if (question.trim() && validOptions.length >= 2) {
      await onSubmit(question.trim(), validOptions)
    }
  }

  const validOptions = options.filter(opt => opt.trim()).length
  const canSubmit = question.trim() && validOptions >= 2 && !isSubmitting

  return (
    <form onSubmit={handleSubmit} className={`${gothamBook.className} space-y-6`}>
      {/* Question Section */}
      <div className="space-y-3">
        <label className={`${gothamMedium.className} block text-sm font-medium text-gray-300 mb-2`}>
          Poll Question
        </label>
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What would you like to ask your audience?"
          rows={3}
          className="border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 resize-none"
          required
        />
      </div>

      {/* Multiple Choice Toggle */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="multiple-choice"
            checked={isMultipleChoice}
            onCheckedChange={handleMultipleChoiceChange}
          />
          <label htmlFor="multiple-choice" className={`${gothamMedium.className} text-sm font-medium text-gray-300`}>
            Multiple Choice
          </label>
        </div>
      </div>
      
      {/* Options Section */}
      <div className="space-y-4">
        <label className={`${gothamMedium.className} block text-sm font-medium text-gray-300 mb-3 flex items-center gap-2`}>
          Poll Options
          <span className="text-xs text-gray-400 ml-auto">
            {validOptions}/6
          </span>
        </label>
        <div className="space-y-3">
          {options.map((option, index) => (
            <div 
              key={index} 
              className={`flex gap-3 transition-all duration-300 ${
                hoveredOption === index ? 'scale-105' : 'scale-100'
              } ${
                focusedOption === index ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
              }`}
              onMouseEnter={() => setHoveredOption(index)}
              onMouseLeave={() => setHoveredOption(null)}
            >
              <div className="flex-1 relative group">
                <Input
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  onFocus={() => setFocusedOption(index)}
                  onBlur={() => setFocusedOption(null)}
                  placeholder={isMultipleChoice ? `Option ${index + 1}...` : (index === 0 ? 'Yes' : 'No')}
                  className="border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200 hover:shadow-sm focus:shadow-md"
                  required={index < 2}
                />
              </div>
              {isMultipleChoice && options.length > 2 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeOption(index)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20 border-red-600 hover:border-red-500 transition-all duration-200 hover:scale-110"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        
        {isMultipleChoice && options.length < 6 && (
          <Button
            type="button"
            variant="outline"
            onClick={addOption}
            className="w-full border-dashed border-2 border-gray-600 hover:border-blue-400 hover:bg-blue-900/20 transition-all duration-200 hover:scale-[1.02] group text-gray-300"
          >
            <Plus className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
            Add Option
          </Button>
        )}
      </div>

      {/* Submit Section */}
      <div className="pt-4">
        <Button
          type="submit"
          disabled={!canSubmit}
          className={`w-full transition-all duration-300 ${
            canSubmit 
              ? 'bg-blue-600 hover:bg-blue-700 hover:scale-105' 
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Launch Poll
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
