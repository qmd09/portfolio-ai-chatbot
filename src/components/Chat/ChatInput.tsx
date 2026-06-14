import { useState } from 'react'
import type { KeyboardEvent } from 'react'

interface ChatInputProps {
  onSend: (content: string) => void
  isDisabled: boolean
  isSessionLimitReached: boolean
}

export default function ChatInput({ onSend, isDisabled, isSessionLimitReached }: ChatInputProps) {
  const [value, setValue] = useState('')

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || isDisabled) return
    onSend(trimmed)
    setValue('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (isSessionLimitReached) {
    return (
      <div
        style={{
          borderTop: '0.5px solid rgba(255,255,255,0.07)',
          padding: '0.75rem 1rem',
          textAlign: 'center',
          fontSize: 12,
          color: 'rgba(232,232,240,0.35)',
          lineHeight: 1.5,
        }}
      >
        you've reached the session limit. refresh the page to start a new conversation.
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.5rem',
        borderTop: '0.5px solid rgba(255,255,255,0.07)',
        padding: '0.75rem 1rem',
      }}
    >
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="ask me anything about tony..."
        disabled={isDisabled}
        style={{
          flex: 1,
          background: 'rgba(255,255,255,0.05)',
          border: '0.5px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          color: '#e8e8f0',
          fontSize: 14,
          padding: '0.5rem 0.75rem',
          outline: 'none',
          opacity: isDisabled ? 0.5 : 1,
          transition: 'border-color 0.15s',
        }}
        onFocus={e => (e.target.style.borderColor = 'rgba(124,111,255,0.5)')}
        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
      />
      <button
        onClick={handleSend}
        disabled={isDisabled || !value.trim()}
        style={{
          background: '#7c6fff',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          padding: '0.5rem 0.9rem',
          fontSize: 13,
          cursor: isDisabled || !value.trim() ? 'not-allowed' : 'pointer',
          opacity: isDisabled || !value.trim() ? 0.5 : 1,
          transition: 'opacity 0.15s',
          flexShrink: 0,
        }}
      >
        send
      </button>
    </div>
  )
}
