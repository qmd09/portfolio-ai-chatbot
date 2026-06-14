import { useState } from 'react'
import type { FormEvent } from 'react'

interface VisitorGateProps {
  onSubmit: (name: string, email: string) => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '0.5px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: '#e8e8f0',
  fontSize: 14,
  padding: '0.6rem 0.8rem',
  outline: 'none',
  transition: 'border-color 0.15s',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function VisitorGate({ onSubmit }: VisitorGateProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedName) { setError('please enter your name'); return }
    if (!EMAIL_RE.test(trimmedEmail)) { setError('please enter a valid email address'); return }

    setError('')
    onSubmit(trimmedName, trimmedEmail)
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '1.1rem',
        padding: '1.5rem 1.5rem 1.25rem',
      }}
    >
      <div>
        <p style={{ fontSize: 15, color: '#e8e8f0', fontWeight: 500, marginBottom: '0.4rem' }}>
          before we begin
        </p>
        <p style={{ fontSize: 13, color: 'rgba(232,232,240,0.5)', lineHeight: 1.55 }}>
          so Tony knows who stopped by — please do introduce yourself.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div>
          <label style={{ fontSize: 11, color: 'rgba(232,232,240,0.4)', display: 'block', marginBottom: '0.3rem', letterSpacing: '0.04em' }}>
            your name
          </label>
          <input
            type="text"
            placeholder="e.g. Jane Smith"
            value={name}
            onChange={e => setName(e.target.value)}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
            style={{
              ...inputStyle,
              borderColor: focusedField === 'name' ? 'rgba(124,111,255,0.5)' : 'rgba(255,255,255,0.12)',
            }}
            autoComplete="name"
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'rgba(232,232,240,0.4)', display: 'block', marginBottom: '0.3rem', letterSpacing: '0.04em' }}>
            your email
          </label>
          <input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            style={{
              ...inputStyle,
              borderColor: focusedField === 'email' ? 'rgba(124,111,255,0.5)' : 'rgba(255,255,255,0.12)',
            }}
            autoComplete="email"
          />
        </div>
      </div>

      {error && (
        <p style={{ fontSize: 12, color: '#ff6b8a', margin: 0 }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        style={{
          background: '#7c6fff',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          padding: '0.65rem 1rem',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'opacity 0.15s',
          width: '100%',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        start chatting with Alfred
      </button>

      <p style={{ fontSize: 11, color: 'rgba(232,232,240,0.28)', margin: 0, lineHeight: 1.5 }}>
        your details are only shared with Tony and are never stored publicly.
      </p>
    </form>
  )
}
