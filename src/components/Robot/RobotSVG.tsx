interface RobotSVGProps {
  onClick?: () => void
  size?: number
  isPulsing?: boolean
  'aria-label'?: string
}

export default function RobotSVG({ onClick, size = 56, isPulsing = false, 'aria-label': ariaLabel }: RobotSVGProps) {
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      onClick={onClick}
      className={isPulsing ? 'robot-pulse' : undefined}
      aria-label={ariaLabel}
      style={{
        background: 'none',
        border: 'none',
        cursor: onClick ? 'pointer' : 'default',
        padding: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* antenna */}
        <line x1="28" y1="13" x2="28" y2="7" stroke="rgba(124,111,255,0.7)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="28" cy="5" r="2.5" fill="#7c6fff" />
        {/* head */}
        <rect x="9" y="13" width="38" height="28" rx="7" fill="rgba(124,111,255,0.12)" stroke="rgba(124,111,255,0.55)" strokeWidth="1.5" />
        {/* eyes */}
        <circle cx="20" cy="25" r="4.5" fill="rgba(124,111,255,0.25)" stroke="#7c6fff" strokeWidth="1.5" />
        <circle cx="20" cy="25" r="2" fill="#7c6fff" />
        <circle cx="36" cy="25" r="4.5" fill="rgba(124,111,255,0.25)" stroke="#7c6fff" strokeWidth="1.5" />
        <circle cx="36" cy="25" r="2" fill="#7c6fff" />
        {/* mouth */}
        <rect x="18" y="33" width="20" height="3.5" rx="1.75" fill="rgba(124,111,255,0.45)" />
        {/* body stub */}
        <rect x="16" y="43" width="24" height="7" rx="3.5" fill="rgba(124,111,255,0.1)" stroke="rgba(124,111,255,0.35)" strokeWidth="1" />
      </svg>
    </Tag>
  )
}
