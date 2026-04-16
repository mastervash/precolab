import React, { useEffect, useState, useRef } from 'react'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'

const ACTION_LABELS = {
  created_card: 'created card',
  updated_card: 'updated card',
  deleted_card: 'deleted card',
  created_doc: 'created document',
  created_board: 'created board',
}

export default function ActivityPage() {
  const { currentWorkspace } = useAuthStore()
  const [events, setEvents] = useState([])
  const esRef = useRef(null)
  const wid = currentWorkspace?.id
  const apiBase = import.meta.env.VITE_API_URL || ''

  useEffect(() => {
    if (!wid) return
    api.get(`/api/workspaces/${wid}/activity?limit=50`).then(r => setEvents(r.data))

    // SSE stream for live updates
    const es = new EventSource(`${apiBase}/api/workspaces/${wid}/activity/stream`)
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)
        setEvents(prev => [event, ...prev].slice(0, 100))
      } catch {}
    }
    esRef.current = es
    return () => es.close()
  }, [wid])

  function timeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: '0 auto' }}>
      <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 24 }}>Activity Feed</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {events.length === 0 && (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 48 }}>No activity yet.</div>
        )}
        {events.map(ev => (
          <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: ev.avatar_color || 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 13, color: '#fff',
            }}>
              {ev.username?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600 }}>{ev.username}</span>
              {' '}
              <span style={{ color: 'var(--text-muted)' }}>{ACTION_LABELS[ev.action] || ev.action}</span>
              {ev.entity_title && <span style={{ fontStyle: 'italic' }}> "{ev.entity_title}"</span>}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, flexShrink: 0 }}>{timeAgo(ev.created_at)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
