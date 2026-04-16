import React from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore.js'

const Icon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const TILES = [
  {
    to: '/kanban',
    icon: 'M3 3h6v18H3z M9 3h6v10H9z M15 3h6v14h-6z',
    label: 'Kanban',
    desc: 'Drag-and-drop task boards',
    color: '#7c6ffd',
  },
  {
    to: '/docs',
    icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
    label: 'Docs',
    desc: 'Live collaborative documents',
    color: '#3b82f6',
  },
  {
    to: '/todos',
    icon: 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
    label: 'To-Do',
    desc: 'Shared task lists',
    color: '#10b981',
  },
  {
    to: '/chat',
    icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    label: 'Chat',
    desc: 'Team messaging channels',
    color: '#f59e0b',
  },
  {
    to: '/whiteboard',
    icon: 'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
    label: 'Whiteboard',
    desc: 'Collaborative canvas',
    color: '#ec4899',
  },
  {
    to: '/mindmap',
    icon: 'M6 3v12 M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M15 6a9 9 0 0 1-9 9',
    label: 'Mind Map',
    desc: 'Visual idea mapping',
    color: '#8b5cf6',
  },
  {
    to: '/images',
    icon: 'M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M21 15l-5-5L5 21',
    label: 'Images',
    desc: 'Gallery with crop & annotate',
    color: '#06b6d4',
  },
  {
    to: '/files',
    icon: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
    label: 'Files',
    desc: 'Shared file storage',
    color: '#64748b',
  },
  {
    to: '/calendar',
    icon: 'M3 4h18v18H3z M16 2v4 M8 2v4 M3 10h18',
    label: 'Calendar',
    desc: 'Team scheduling',
    color: '#f43f5e',
  },
  {
    to: '/polls',
    icon: 'M18 20V10 M12 20V4 M6 20v-6',
    label: 'Polls',
    desc: 'Team voting & decisions',
    color: '#a78bfa',
  },
  {
    to: '/activity',
    icon: 'M22 12h-4l-3 9L9 3l-3 9H2',
    label: 'Activity',
    desc: 'Live workspace feed',
    color: '#34d399',
  },
]

export default function DashboardPage() {
  const { user, currentWorkspace } = useAuthStore()

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)' }}>
            Good to see you, {user?.username}
          </span>
          <span style={{ fontSize: 20 }}>👋</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--success)',
            boxShadow: '0 0 6px var(--success)',
          }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {currentWorkspace?.name}
          </span>
        </div>
      </div>

      {/* Tiles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
        gap: 14,
      }}>
        {TILES.map(t => (
          <Link key={t.to} to={t.to} style={{ textDecoration: 'none' }}>
            <TileCard tile={t} />
          </Link>
        ))}
      </div>
    </div>
  )
}

function TileCard({ tile }) {
  const [hovered, setHovered] = React.useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--bg-3)' : 'var(--bg-2)',
        border: `1px solid ${hovered ? 'var(--border-hover)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '18px 18px 16px',
        cursor: 'pointer',
        transition: 'all var(--t)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? 'var(--shadow)' : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow on hover */}
      <div style={{
        position: 'absolute', top: -30, right: -30,
        width: 100, height: 100, borderRadius: '50%',
        background: `radial-gradient(circle, ${tile.color}22 0%, transparent 70%)`,
        opacity: hovered ? 1 : 0,
        transition: 'opacity var(--t)',
        pointerEvents: 'none',
      }} />

      {/* Icon */}
      <div style={{
        width: 36, height: 36,
        borderRadius: 9,
        background: `${tile.color}18`,
        border: `1px solid ${tile.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
        color: tile.color,
        transition: 'transform var(--t)',
        transform: hovered ? 'scale(1.06)' : 'scale(1)',
      }}>
        <Icon d={tile.icon} size={16} />
      </div>

      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 4, letterSpacing: '-0.01em' }}>
        {tile.label}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5 }}>
        {tile.desc}
      </div>

      {/* Arrow on hover */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16,
        color: tile.color,
        opacity: hovered ? 0.8 : 0,
        transition: 'opacity var(--t), transform var(--t)',
        transform: hovered ? 'translateX(0)' : 'translateX(-4px)',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M5 12h14 M12 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}
