import React, { useEffect, useState, useRef } from 'react'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'

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

function Avatar({ name, color, size = 30 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${color || '#7c6ffd'}, ${color ? color + 'aa' : '#a78bfa'})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.38, color: '#fff',
    }}>
      {name?.[0]?.toUpperCase()}
    </div>
  )
}

export default function ActivityPage() {
  const { currentWorkspace } = useAuthStore()
  const [events, setEvents] = useState([])
  const [live, setLive] = useState(false)
  const esRef = useRef(null)
  const wid = currentWorkspace?.id
  const apiBase = import.meta.env.VITE_API_URL || ''

  useEffect(() => {
    if (!wid) return
    api.get(`/api/workspaces/${wid}/activity?limit=50`).then(r => setEvents(r.data))
    const es = new EventSource(`${apiBase}/api/workspaces/${wid}/activity/stream`)
    es.onopen = () => setLive(true)
    es.onerror = () => setLive(false)
    es.onmessage = (e) => {
      try { setEvents(prev => [JSON.parse(e.data), ...prev].slice(0, 100)) } catch {}
    }
    esRef.current = es
    return () => es.close()
  }, [wid])

  return (
    <div className="page" style={{ maxWidth: 680 }}>
      <div className="page-header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
        <h2 className="page-title">Activity</h2>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          marginLeft: 4,
          background: live ? 'rgba(52,211,153,0.1)' : 'var(--bg-3)',
          border: `1px solid ${live ? 'rgba(52,211,153,0.25)' : 'var(--border)'}`,
          borderRadius: 999, padding: '3px 10px',
          fontSize: 11, fontWeight: 500,
          color: live ? 'var(--success)' : 'var(--text-muted)',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: live ? 'var(--success)' : 'var(--text-subtle)', boxShadow: live ? '0 0 6px var(--success)' : 'none' }} />
          {live ? 'Live' : 'Connecting…'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {events.length === 0 && (
          <div className="empty-state" style={{ marginTop: 32 }}>
            <div className="empty-state-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
            </div>
            <div className="empty-state-title">No activity yet</div>
            <div className="empty-state-desc">Start using the workspace and events will appear here in real-time</div>
          </div>
        )}
        {events.map(ev => {
          const meta = ACTION_META[ev.action]
          return (
            <div key={ev.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              transition: 'border-color var(--t-fast)',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <Avatar name={ev.username} color={ev.avatar_color} size={28} />
              <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{ev.username}</span>
                <span style={{ color: 'var(--text-muted)' }}> {meta?.label || ev.action}</span>
                {ev.entity_title && (
                  <span style={{ color: 'var(--text-2)' }}> <span style={{ color: 'var(--text-muted)' }}>—</span> {ev.entity_title}</span>
                )}
              </div>
              {meta && (
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: meta.color, flexShrink: 0,
                  boxShadow: `0 0 6px ${meta.color}`,
                }} />
              )}
              <div style={{ color: 'var(--text-subtle)', fontSize: 11, flexShrink: 0, minWidth: 52, textAlign: 'right' }}>
                {timeAgo(ev.created_at)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
