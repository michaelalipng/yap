'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { X, Plus, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import { gothamMedium, gothamBook } from '@/lib/fonts'

interface PollFormProps {
  onSubmit: (question: string, options: string[], correctOptionIndex: number, durationSeconds: number, autoStart: boolean) => void
  isSubmitting?: boolean
}

export default function PollForm({ onSubmit, isSubmitting = false }: PollFormProps) {
  const [question, setQuestion] = useState('')
  const [isMultipleChoice, setIsMultipleChoice] = useState(false)
  const [options, setOptions] = useState(['Yes', 'No'])
  const [hoveredOption, setHoveredOption] = useState<number | null>(null)
  const [focusedOption, setFocusedOption] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0)
  const [durationMinutes, setDurationMinutes] = useState(2)
  const [autoStart, setAutoStart] = useState(true)

  const totalPages = 4

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
      await onSubmit(question.trim(), validOptions, correctOptionIndex, durationMinutes * 60, autoStart)
    }
  }

  const validOptions = options.filter(opt => opt.trim()).length
  const canSubmit = question.trim() && validOptions >= 2 && !isSubmitting

  const renderPage = () => {
    switch (currentPage) {
      case 1:
        return (
          <>
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
          </>
        )

      case 2:
        return (
          <>
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
          </>
        )

      case 3:
        return (
          <div className="space-y-4">
            <h3 className={`${gothamMedium.className} text-xl text-white mb-4`}>Select Correct Answer</h3>
            <div className="space-y-3">
              {options.filter(opt => opt.trim()).map((option, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id={`correct-${index}`}
                    name="correctAnswer"
                    checked={correctOptionIndex === index}
                    onChange={() => setCorrectOptionIndex(index)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                  />
                  <label 
                    htmlFor={`correct-${index}`}
                    className="text-white cursor-pointer flex-1 p-2 rounded hover:bg-gray-800/50 transition-colors"
                  >
                    {option}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <h3 className={`${gothamMedium.className} text-xl text-white mb-4`}>Poll Settings</h3>
            
            {/* Duration Setting */}
            <div className="space-y-3">
              <label className="text-white text-sm font-medium">Poll Duration</label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-white min-w-[80px] text-center bg-gray-800 px-3 py-1 rounded">
                  {durationMinutes} min{durationMinutes !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Auto Start Setting */}
            <div className="flex items-center space-x-3">
              <Checkbox
                id="autoStart"
                checked={autoStart}
                onCheckedChange={(checked) => setAutoStart(checked as boolean)}
              />
              <label htmlFor="autoStart" className="text-white cursor-pointer">
                Start immediately (uncheck to add to queue)
              </label>
            </div>

            {/* Review Section */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
              <h4 className={`${gothamMedium.className} text-lg text-white mb-3`}>Review Your Poll</h4>
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-400">Question:</span> <span className="text-white">{question}</span></div>
                <div><span className="text-gray-400">Type:</span> <span className="text-white">{isMultipleChoice ? 'Multiple Choice' : 'Yes/No'}</span></div>
                <div><span className="text-gray-400">Duration:</span> <span className="text-white">{durationMinutes} minute{durationMinutes !== 1 ? 's' : ''}</span></div>
                <div><span className="text-gray-400">Start:</span> <span className="text-white">{autoStart ? 'Immediately' : 'Add to queue'}</span></div>
                <div><span className="text-gray-400">Options:</span></div>
                <div className="ml-4 space-y-1">
                  {options.filter(opt => opt.trim()).map((option, index) => (
                    <div key={index} className={`${index === correctOptionIndex ? 'text-green-400 font-semibold' : 'text-white'}`}>
                      {index === correctOptionIndex ? '✓ ' : '• '}{option}
                    </div>
                  ))}
                </div>
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
                currentPage === 1 && !question.trim() ||
                currentPage === 2 && validOptions < 2
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!canSubmit}
              className={`transition-all duration-300 ${
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
    </form>
  )
}
