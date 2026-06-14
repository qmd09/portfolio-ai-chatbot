import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '../../hooks/useChat'

interface ChatBubbleProps {
  message: Message
  isStreaming: boolean
}

export default function ChatBubble({ message, isStreaming }: ChatBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div
        className={isUser ? undefined : 'assistant-message'}
        style={{
          background: isUser ? 'rgba(124,111,255,0.2)' : 'rgba(255,255,255,0.05)',
          borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
          padding: '0.6rem 0.9rem',
          maxWidth: '80%',
          fontSize: 14,
          lineHeight: 1.6,
          color: '#e8e8f0',
          wordBreak: 'break-word',
        }}
      >
        {isUser ? (
          message.content
        ) : (
          <>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a({ href, children }) {
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  )
                },
              }}
            >
              {message.content || (isStreaming ? '' : '…')}
            </ReactMarkdown>
            {isStreaming && <span className="cursor-pulse">|</span>}
          </>
        )}
      </div>
    </div>
  )
}
