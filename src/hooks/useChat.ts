import { useState, useCallback, useEffect, useRef } from 'react'
import { systemPrompt } from '../constants/systemPrompt'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  id: string
}

const MAX_SESSION_TOKENS = 4000
const APPROX_TOKENS_PER_CHAR = 0.25

function estimateTokens(text: string): number {
  return Math.ceil(text.length * APPROX_TOKENS_PER_CHAR)
}

// TODO: use import.meta.env.VITE_API_URL for production Lambda endpoint
const CHAT_ENDPOINT = '/api/chat'

function createWelcomeMessage(visitorName?: string): Message {
  const content = visitorName
    ? `Greetings, ${visitorName}. I am Alfred, Tony's ever-faithful digital butler. It is a pleasure to make your acquaintance. I can help answer any questions you have with regard to Tony's career and technical expertise. Please let me know.`
    : `Greetings. I am Alfred, Tony's ever-faithful digital butler. I can help answer any questions you have with regard to Tony's career and technical expertise. Please let me know.`
  return { role: 'assistant', content, id: 'alfred-welcome' }
}

export function useChat(visitorName?: string) {
  const [messages, setMessages] = useState<Message[]>(() => [createWelcomeMessage(visitorName)])
  const [isStreaming, setIsStreaming] = useState(false)
  const [sessionTokensUsed, setSessionTokensUsed] = useState(0)
  const prevNameRef = useRef<string | undefined>(visitorName)

  // When the visitor gate is completed mid-session, update the welcome message
  useEffect(() => {
    if (!visitorName || visitorName === prevNameRef.current) return
    prevNameRef.current = visitorName
    setMessages(prev => {
      // Don't reset if the user has already sent messages
      if (prev.some(m => m.role === 'user')) return prev
      return [createWelcomeMessage(visitorName)]
    })
  }, [visitorName])

  const isSessionLimitReached = sessionTokensUsed >= MAX_SESSION_TOKENS

  const sendMessage = useCallback(
    async (content: string) => {
      if (isStreaming || isSessionLimitReached) return

      const userMessage: Message = {
        role: 'user',
        content,
        id: String(Date.now()),
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        id: String(Date.now() + 1),
      }

      const conversationHistory = [...messages, userMessage]
        .filter(m => m.id !== 'alfred-welcome')
        .map(m => ({ role: m.role, content: m.content }))
        .slice(-20)

      setMessages(prev => [...prev, userMessage, assistantMessage])
      setIsStreaming(true)

      try {
        const response = await fetch(CHAT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: conversationHistory, systemPrompt, visitorName }),
        })

        if (!response.ok) {
          throw new Error(`${response.status}`)
        }

        if (!response.body) throw new Error('no response body')

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let assistantContent = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data) as { type: string; delta?: { type: string; text: string } }
              if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                assistantContent += parsed.delta.text
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { ...updated[updated.length - 1], content: assistantContent }
                  return updated
                })
              }
            } catch {
              // skip non-JSON lines
            }
          }
        }

        const tokensUsed = estimateTokens(content) + estimateTokens(assistantContent)
        setSessionTokensUsed(prev => prev + tokensUsed)
      } catch {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: 'I do beg your pardon — something went wrong on my end. Please do try again.',
          }
          return updated
        })
      } finally {
        setIsStreaming(false)
      }
    },
    [isStreaming, isSessionLimitReached, messages, visitorName],
  )

  return { messages, isStreaming, sessionTokensUsed, isSessionLimitReached, sendMessage }
}
