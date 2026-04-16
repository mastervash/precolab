import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'

const Icon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const ACTION_META = {
  created_card:  { label: 'created card',     color: '#7c6ffd' },
  updated_card:  { label: 'updated card',     color: '#3b82f6' },
  deleted_card:  { label: 'deleted card',     color: '#f0455a' },
  created_doc:   { label: 'created document', color: '#10b981' },
  created_board: { label: 'created board',    color: '#f59e0b' },
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function Avatar({ name, color, size = 26 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${color || '#7c6ffd'}, ${color ? color + 'cc' : '#a78bfa'})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.38, color: '#fff',
    }}>
      {name?.[0]?.toUpperCase()}
    </div>
  )
}

const STAT_TILES = [
  { key: 'cards',      label: 'Cards',       icon: 'M3 3h6v18H3z M9 3h6v10H9z M15 3h6v14h-6z', color: '#7c6ffd', to: '/kanban' },
  { key: 'docs',       label: 'Documents',   icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6', color: '#3b82f6', to: '/docs' },
  { key: 'open_todos', label: 'Open To-dos', icon: 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11', color: '#10b981', to: '/todos' },
  { key: 'files',      label: 'Files',       icon: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z', color: '#f59e0b', to: '/files' },
  { key: 'messages',   label: 'Messages',    icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', color: '#ec4899', to: '/chat' },
  { key: 'members',    label: 'Members',     icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8', color: '#06b6d4', to: '/settings' },
]

const NAV_TILES = [
  { to: '/whiteboard', icon: 'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z', label: 'Whiteboard', desc: 'Collaborative canvas', color: '#ec4899' },
  { to: '/mindmap',    icon: 'M6 3v12 M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M15 6a9 9 0 0 1-9 9', label: 'Mind Map', desc: 'Visual idea mapping', color: '#8b5cf6' },
  { to: '/images',     icon: 'M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M21 15l-5-5L5 21', label: 'Images', desc: 'Gallery & crop', color: '#06b6d4' },
  { to: '/calendar',   icon: 'M3 4h18v18H3z M16 2v4 M8 2v4 M3 10h18', label: 'Calendar', desc: 'Team scheduling', color: '#f43f5e' },
  { to: '/polls',      icon: 'M18 20V10 M12 20V4 M6 20v-6', label: 'Polls', desc: 'Team voting', color: '#a78bfa' },
  { to: '/activity',   icon: 'M22 12h-4l-3 9L9 3l-3 9H2', label: 'Activity', desc: 'Live workspace feed', color: '#34d399' },
]

export default function DashboardPage() {
  const { user, currentWorkspace } = useAuthStore()
  const [stats, setStats] = useState(null)
  const wid = currentWorkspace?.id

  useEffect(() => {
    if (!wid) return
    api.get(`/api/workspaces/${wid}/stats`).then(r => setStats(r.data)).catch(() => {})
  }, [wid])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ padding: '36px 40px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: 6 }}>
          {greeting}, {user?.username}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 6px var(--success)' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{currentWorkspace?.name}</span>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
        {STAT_TILES.map(s => (
          <Link key={s.key} to={s.to} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '16px 18px',
              transition: 'all var(--t)',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: `${s.color}18`, border: `1px solid ${s.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                  <Icon d={s.icon} size={13} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1 }}>
                {stats ? (stats.counts?.[s.key] ?? '–') : (
                  <div style={{ height: 28, width: 40, background: 'var(--bg-3)', borderRadius: 6, animation: 'pulse 1.5s ease infinite' }} />
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Two-column: recent activity + members */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, marginBottom: 28 }}>
        {/* Recent activity */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>Recent Activity</span>
            <Link to="/activity" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>See all →</Link>
          </div>
          {!stats ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 32, background: 'var(--bg-3)', borderRadius: 6, animation: 'pulse 1.5s ease infinite' }} />)}
            </div>
          ) : stats.recentActivity.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-subtle)', textAlign: 'center', padding: '16px 0' }}>No activity yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.recentActivity.map((ev, i) => {
                const meta = ACTION_META[ev.action]
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={ev.username} color={ev.avatar_color} size={26} />
                    <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{ev.username}</span>
                      {' '}{meta?.label || ev.action}
                      {ev.entity_title && <span style={{ color: 'var(--text-2)' }}> — {ev.entity_title}</span>}
                    </div>
                    {meta && <div style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />}
                    <span style={{ fontSize: 11, color: 'var(--text-subtle)', flexShrink: 0 }}>{timeAgo(ev.created_at)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Team members */}
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>Team</span>
            <Link to="/settings" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>Manage →</Link>
          </div>
          {!stats ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 36, background: 'var(--bg-3)', borderRadius: 6, animation: 'pulse 1.5s ease infinite' }} />)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.members.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={m.username} color={m.avatar_color} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.username}</div>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-subtle)', fontWeight: 500, textTransform: 'capitalize' }}>{m.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick access nav tiles */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
          Quick Access
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {NAV_TILES.map(t => (
            <Link key={t.to} to={t.to} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--bg-2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                transition: 'all var(--t)',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.background = 'var(--bg-3)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-2)' }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${t.color}18`, border: `1px solid ${t.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.color, flexShrink: 0 }}>
                  <Icon d={t.icon} size={14} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  )
}
