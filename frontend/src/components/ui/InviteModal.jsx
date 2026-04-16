import React, { useState } from 'react'
import api from '../../api/client.js'
import { useAuthStore } from '../../store/authStore.js'
import { toast } from './Toast.jsx'

export default function InviteModal({ onClose }) {
  const { currentWorkspace } = useAuthStore()
  const [role, setRole] = useState('editor')
  const [loading, setLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState(null)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    try {
      const { data } = await api.post(`/api/workspaces/${currentWorkspace.id}/invite`, { role })
      setInviteUrl(data.url)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate invite link')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    toast.success('Link copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
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
              {currentWorkspace?.name} · link expires in 7 days, single use
            </p>
          </div>
          <button onClick={onClose} className="btn-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18 M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Role picker */}
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
                  onClick={() => { setRole(r.value); setInviteUrl(null) }}
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

          {/* Generated URL */}
          {inviteUrl ? (
            <div>
              <label style={{ marginBottom: 6, display: 'block' }}>Invite link</label>
              <div style={{
                display: 'flex', gap: 8, alignItems: 'center',
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '8px 12px',
              }}>
                <span style={{
                  flex: 1, fontSize: 12, color: 'var(--text-muted)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {inviteUrl}
                </span>
                <button
                  onClick={handleCopy}
                  className={copied ? 'btn-primary' : 'btn-ghost'}
                  style={{ fontSize: 12, flexShrink: 0, padding: '5px 12px' }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 6 }}>
                Share this link. It can only be used once and expires in 7 days.
              </p>
            </div>
          ) : (
            <button
              onClick={handleGenerate}
              className="btn-primary"
              disabled={loading}
              style={{ justifyContent: 'center', padding: '10px' }}
            >
              {loading ? 'Generating…' : 'Generate Invite Link'}
            </button>
          )}

          {inviteUrl && (
            <button
              onClick={handleGenerate}
              className="btn-ghost"
              disabled={loading}
              style={{ fontSize: 12 }}
            >
              Generate another link
            </button>
          )}
        </div>
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
