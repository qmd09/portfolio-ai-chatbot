import { useState } from 'react'

export interface Visitor {
  name: string
  email: string
}

const STORAGE_KEY = 'alfred-visitor'

export function useVisitor() {
  const [visitor, setVisitor] = useState<Visitor | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? (JSON.parse(stored) as Visitor) : null
    } catch {
      return null
    }
  })

  const registerVisitor = (name: string, email: string) => {
    const v: Visitor = { name, email }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
    } catch {
      // localStorage unavailable (private browsing, quota exceeded) — continue anyway
    }
    setVisitor(v)

    // Fire-and-forget — chat starts immediately regardless of whether this succeeds
    fetch('/api/visitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, timestamp: new Date().toISOString() }),
    }).catch(() => {})
  }

  return { visitor, registerVisitor }
}
