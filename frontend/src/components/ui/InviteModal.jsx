import React, { useState } from 'react'
import api from '../../api/client.js'
import { useAuthStore } from '../../store/authStore.js'
import { toast } from './Toast.jsx'

export default function InviteModal({ onClose }) {
  const { currentWorkspace } = useAuthStore()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('editor')
  const [loading, setLoading] = useState(false)

  async function handleInvite(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      await api.post(`/api/workspaces/${currentWorkspace.id}/invite`, {
        email: email.trim(),
        role,
      })
      toast.success(`Invited ${email.trim()} as ${role}`)
      setEmail('')
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to invite user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border-hover)',
        borderRadius: 'var(--radius-xl)',
        padding: 28,
        width: 420,
        boxShadow: 'var(--shadow-lg)',
        animation: 'modal-in 0.18s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', marginBottom: 4 }}>
              Invite to workspace
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              {currentWorkspace?.name}
            </p>
          </div>
          <button onClick={onClose} className="btn-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18 M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label>Email address</label>
            <input
              type="email" required autoFocus
              placeholder="teammate@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label>Role</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 0 }}>
              {[
                { value: 'viewer', label: 'Viewer', desc: 'Read only' },
                { value: 'editor', label: 'Editor', desc: 'Can edit' },
                { value: 'admin',  label: 'Admin',  desc: 'Full access' },
              ].map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 'var(--radius)',
                    background: role === r.value ? 'var(--primary-dim)' : 'var(--bg-3)',
                    border: role === r.value ? '1px solid rgba(124,111,253,0.3)' : '1px solid var(--border)',
                    color: role === r.value ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all var(--t-fast)',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{r.label}</div>
                  <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !email.trim()}
            style={{ justifyContent: 'center', padding: '10px', marginTop: 4 }}
          >
            {loading ? 'Sending invite…' : 'Send Invite'}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}
