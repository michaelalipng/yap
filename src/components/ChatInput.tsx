'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme } from '@/lib/useTheme'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
  placeholder?: string
  maxLength?: number
  isFrozen?: boolean
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "Type a message...",
  maxLength = 500,
  isFrozen = false
}: ChatInputProps) {
  const { getComponentStyle, getColor, getBorderRadius } = useTheme()
  const [isFocused, setIsFocused] = useState(false)
  const [characterCount, setCharacterCount] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const containerStyle = getComponentStyle('chat', 'inputContainer')
  const inputStyle = {
    ...getComponentStyle('chat', 'input'),
    ...(isFocused && getComponentStyle('chat', 'inputFocus'))
  }
  const sendButtonStyle = getComponentStyle('chat', 'sendButton')

  useEffect(() => {
    setCharacterCount(value.length)
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim() && !isFrozen) {
        onSend()
      }
    }
  }

  const handleSend = () => {
    if (!disabled && value.trim() && !isFrozen) {
      onSend()
    }
  }

  const getCharacterCountColor = () => {
    const percentage = (characterCount / maxLength) * 100
    if (percentage >= 90) return getColor('error.500')
    if (percentage >= 75) return getColor('warning.500')
    return getColor('neutral.500')
  }

  const isSendDisabled = disabled || !value.trim() || isFrozen || characterCount > maxLength

  return (
    <div 
      className="chat-input-container"
      style={containerStyle}
    >
      {/* Input Area */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={isFrozen ? "Chat is frozen by a moderator" : placeholder}
          disabled={disabled || isFrozen}
          maxLength={maxLength}
          rows={1}
          className="chat-textarea resize-none w-full"
          style={{
            ...inputStyle,
            minHeight: '48px',
            maxHeight: '120px',
            fontFamily: 'inherit',
            resize: 'none'
          }}
        />
        
        {/* Character Count */}
        <div 
          className="character-count absolute bottom-2 right-2 text-xs"
          style={{ 
            color: getCharacterCountColor(),
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '2px 6px',
            borderRadius: getBorderRadius('sm'),
            fontSize: '0.75rem'
          }}
        >
          {characterCount}/{maxLength}
        </div>
      </div>

      {/* Send Button */}
      <button
        onClick={handleSend}
        disabled={isSendDisabled}
        className="send-button flex items-center justify-center gap-2"
        style={{
          ...sendButtonStyle,
          opacity: isSendDisabled ? 0.5 : 1,
          cursor: isSendDisabled ? 'not-allowed' : 'pointer',
          minWidth: '80px'
        }}
      >
        <span>Send</span>
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          style={{ transform: 'rotate(45deg)' }}
        >
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      </button>

      {/* Frozen Chat Warning */}
      {isFrozen && (
        <div 
          className="frozen-warning absolute -top-12 left-0 right-0 text-center p-2 rounded-lg"
          style={{
            background: getColor('error.50'),
            border: `2px solid ${getColor('error.200')}`,
            color: getColor('error.700'),
            fontSize: '0.875rem',
            fontWeight: 500
          }}
        >
          ❄️ Chat is currently frozen by a moderator
        </div>
      )}

      {/* Quick Actions */}
      <div 
        className="quick-actions flex gap-2 mt-3"
        style={{ opacity: 0.7 }}
      >
        <button
          onClick={() => onChange(value + ' 😊')}
          disabled={disabled || isFrozen}
          className="quick-action-btn text-sm px-2 py-1 rounded"
          style={{
            background: getColor('neutral.100'),
            color: getColor('neutral.600'),
            border: 'none',
            cursor: disabled || isFrozen ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          😊
        </button>
        <button
          onClick={() => onChange(value + ' 👍')}
          disabled={disabled || isFrozen}
          className="quick-action-btn text-sm px-2 py-1 rounded"
          style={{
            background: getColor('neutral.100'),
            color: getColor('neutral.600'),
            border: 'none',
            cursor: disabled || isFrozen ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          👍
        </button>
        <button
          onClick={() => onChange(value + ' 🎉')}
          disabled={disabled || isFrozen}
          className="quick-action-btn text-sm px-2 py-1 rounded"
          style={{
            background: getColor('neutral.100'),
            color: getColor('neutral.600'),
            border: 'none',
            cursor: disabled || isFrozen ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          🎉
        </button>
      </div>

      {/* Auto-resize textarea */}
      <style jsx>{`
        .chat-textarea {
          transition: all 0.2s ease;
        }
        
        .chat-textarea:focus {
          outline: none;
        }
        
        .send-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.2);
        }
        
        .quick-action-btn:hover:not(:disabled) {
          background: rgba(59, 130, 246, 0.1) !important;
          color: rgb(59, 130, 246) !important;
        }
      `}</style>
    </div>
  )
} 