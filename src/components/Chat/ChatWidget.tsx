import { useRef, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useChat } from '../../hooks/useChat'
import { useVisitor } from '../../hooks/useVisitor'
import ChatBubble from './ChatBubble'
import ChatInput from './ChatInput'
import ChatSuggestions from './ChatSuggestions'
import VisitorGate from './VisitorGate'
import RobotSVG from '../Robot/RobotSVG'

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const { visitor, registerVisitor } = useVisitor()
  const { messages, isStreaming, isSessionLimitReached, sendMessage } = useChat(visitor?.name)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const lastMessageId = messages[messages.length - 1]?.id
  const hasUserMessage = messages.some(m => m.role === 'user')
  const showGate = !visitor

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            key="robot-trigger"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}
          >
            <RobotSVG onClick={() => setIsOpen(true)} isPulsing />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-panel"
            className="chat-panel"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              width: 380,
              height: 520,
              background: '#0d0d18',
              border: '0.5px solid rgba(124,111,255,0.3)',
              borderRadius: 16,
              boxShadow: '0 8px 40px rgba(124,111,255,0.15)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 1000,
              overflow: 'hidden',
            }}
          >
            {/* header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                borderBottom: '0.5px solid rgba(255,255,255,0.07)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <RobotSVG size={40} />
                <div>
                  <div style={{ fontSize: 13, color: '#e8e8f0', fontWeight: 500 }}>Alfred</div>
                  <div style={{ fontSize: 11, color: 'rgba(232,232,240,0.4)', marginTop: 1 }}>Tony's butler</div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(232,232,240,0.4)',
                  cursor: 'pointer',
                  fontSize: 20,
                  lineHeight: 1,
                  padding: '0.2rem 0.4rem',
                  borderRadius: 4,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(232,232,240,0.8)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(232,232,240,0.4)')}
                aria-label="close chat"
              >
                ×
              </button>
            </div>

            {/* gate or chat */}
            {showGate ? (
              <VisitorGate onSubmit={registerVisitor} />
            ) : (
              <>
                {/* messages */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    padding: '1rem',
                  }}
                >
                  {messages.map(msg => (
                    <ChatBubble
                      key={msg.id}
                      message={msg}
                      isStreaming={isStreaming && msg.id === lastMessageId && msg.role === 'assistant'}
                    />
                  ))}
                  {!hasUserMessage && <ChatSuggestions onSelect={sendMessage} />}
                  <div ref={messagesEndRef} />
                </div>

                {/* input */}
                <div style={{ flexShrink: 0 }}>
                  <ChatInput
                    onSend={sendMessage}
                    isDisabled={isStreaming || isSessionLimitReached}
                    isSessionLimitReached={isSessionLimitReached}
                  />
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
