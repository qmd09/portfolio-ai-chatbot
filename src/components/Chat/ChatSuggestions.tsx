const SUGGESTIONS = [
  "what did tony build at shosha?",
  "what testing tools has he used?",
  "is he available for work?",
  "what's he currently learning?",
]

interface ChatSuggestionsProps {
  onSelect: (text: string) => void
}

export default function ChatSuggestions({ onSelect }: ChatSuggestionsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.25rem 0' }}>
      <p style={{ fontSize: 12, color: 'rgba(232,232,240,0.35)', marginBottom: '0.25rem' }}>
        try asking…
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {SUGGESTIONS.map(suggestion => (
          <button
            key={suggestion}
            onClick={() => onSelect(suggestion)}
            style={{
              background: 'rgba(124,111,255,0.1)',
              border: '0.5px solid rgba(124,111,255,0.3)',
              color: '#7c6fff',
              borderRadius: 99,
              fontSize: 13,
              padding: '0.4rem 0.9rem',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,111,255,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(124,111,255,0.1)')}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
