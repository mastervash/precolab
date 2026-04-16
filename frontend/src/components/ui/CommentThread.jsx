import React, { useEffect, useState, useRef } from 'react'
import api from '../../api/client.js'
import { useAuthStore } from '../../store/authStore.js'
import { toast } from './Toast.jsx'

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
      background: `linear-gradient(135deg, ${color || '#7c6ffd'}, ${color ? color + 'aa' : '#a78bfa'})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.38, color: '#fff',
    }}>
      {name?.[0]?.toUpperCase()}
    </div>
  )
}

/**
 * Reusable comment thread panel.
 * Props: entityType ('card' | 'document' | ...), entityId (UUID)
 */
export default function CommentThread({ entityType, entityId }) {
  const { user } = useAuthStore()
  const [comments, setComments] = useState([])
  const [body, setBody] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editBody, setEditBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!entityType || !entityId) return
    api.get(`/api/comments?entityType=${entityType}&entityId=${entityId}`)
      .then(r => setComments(r.data))
      .catch(() => {})
  }, [entityType, entityId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!body.trim()) return
    setSubmitting(true)
    try {
      const { data } = await api.post('/api/comments', { entityType, entityId, body: body.trim() })
      setComments(c => [...c, { ...data, username: user.username, avatar_color: user.avatarColor }])
      setBody('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch {
      toast.error('Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit(id) {
    if (!editBody.trim()) return
    try {
      const { data } = await api.patch(`/api/comments/${id}`, { body: editBody.trim() })
      setComments(c => c.map(x => x.id === id ? { ...x, body: data.body, updated_at: data.updated_at } : x))
      setEditingId(null)
    } catch {
      toast.error('Failed to update comment')
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/api/comments/${id}`)
      setComments(c => c.filter(x => x.id !== id))
    } catch {
      toast.error('Failed to delete comment')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)',
        textTransform: 'uppercase', letterSpacing: '0.07em',
        marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        Comments {comments.length > 0 && `· ${comments.length}`}
      </div>

      {/* Comment list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {comments.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-subtle)', textAlign: 'center', padding: '12px 0' }}>
            No comments yet
          </div>
        )}
        {comments.map(c => (
          <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Avatar name={c.username} color={c.avatar_color} size={26} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>{c.username}</span>
                <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{timeAgo(c.created_at)}</span>
                {c.updated_at && c.updated_at !== c.created_at && (
                  <span style={{ fontSize: 10, color: 'var(--text-subtle)' }}>(edited)</span>
                )}
              </div>
              {editingId === c.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <textarea
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                    autoFocus
                    rows={2}
                    style={{
                      resize: 'vertical', fontSize: 12, padding: '6px 10px',
                      background: 'var(--bg-3)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)', color: 'var(--text)',
                      fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleEdit(c.id)} className="btn-primary" style={{ fontSize: 11, padding: '4px 10px' }}>Save</button>
                    <button onClick={() => setEditingId(null)} className="btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, group: 'comment' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, flex: 1, margin: 0, wordBreak: 'break-word' }}>
                    {c.body}
                  </p>
                  {c.author_id === user?.id && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => { setEditingId(c.id); setEditBody(c.body) }}
                        className="btn-icon"
                        style={{ opacity: 0.5, padding: 3 }}
                        title="Edit"
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="btn-icon"
                        style={{ opacity: 0.5, padding: 3, color: 'var(--danger)' }}
                        title="Delete"
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18 M6 6l12 12" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <Avatar name={user?.username} color={user?.avatarColor} size={26} />
        <div style={{ flex: 1, position: 'relative' }}>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e) }}
            placeholder="Add a comment… (⌘+Enter to submit)"
            rows={2}
            style={{
              resize: 'none', fontSize: 12, padding: '8px 10px',
              background: 'var(--bg-3)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', color: 'var(--text)',
              fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
              transition: 'border-color var(--t-fast)',
              outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
        <button
          type="submit"
          className="btn-primary"
          disabled={!body.trim() || submitting}
          style={{ fontSize: 12, padding: '7px 14px', flexShrink: 0 }}
        >
          Post
        </button>
      </form>
    </div>
  )
}
