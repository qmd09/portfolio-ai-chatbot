import ChatWidget from './components/Chat/ChatWidget'

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'rgba(232,232,240,0.3)', fontSize: 13, letterSpacing: '0.05em' }}>
        click the robot →
      </p>
      <ChatWidget />
    </div>
  )
}
