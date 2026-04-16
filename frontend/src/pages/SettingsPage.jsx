import React, { useEffect, useState } from 'react'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'
import { toast } from '../components/ui/Toast.jsx'
import InviteModal from '../components/ui/InviteModal.jsx'

const ROLE_COLORS = { admin: '#f59e0b', editor: '#7c6ffd', viewer: '#6b6b8a' }
const ROLE_LABELS = { admin: 'Admin', editor: 'Editor', viewer: 'Viewer' }

function Avatar({ name, color, size = 34 }) {
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

export default function SettingsPage() {
  const { user, currentWorkspace, workspaces, setCurrentWorkspace, setAuth, accessToken, refreshToken } = useAuthStore()
  const [members, setMembers] = useState([])
  const [wsName, setWsName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const wid = currentWorkspace?.id
  const isAdmin = currentWorkspace?.role === 'admin'

  useEffect(() => {
    if (!wid) return
    setWsName(currentWorkspace?.name || '')
    api.get(`/api/workspaces/${wid}/members`)
      .then(r => setMembers(r.data))
      .catch(() => {})
  }, [wid])

  async function handleRename() {
    if (!wsName.trim() || wsName === currentWorkspace?.name) { setEditingName(false); return }
    try {
      const { data } = await api.patch(`/api/workspaces/${wid}`, { name: wsName.trim() })
      const updated = workspaces.map(w => w.id === wid ? { ...w, name: data.name } : w)
      setAuth(user, updated, accessToken, refreshToken)
      setCurrentWorkspace({ ...currentWorkspace, name: data.name })
      toast.success('Workspace renamed')
      setEditingName(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to rename')
    }
  }

  async function handleRoleChange(memberId, role) {
    try {
      await api.patch(`/api/workspaces/${wid}/members/${memberId}`, { role })
      setMembers(m => m.map(x => x.id === memberId ? { ...x, role } : x))
      toast.success('Role updated')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update role')
    }
  }

  async function handleRemove(memberId, username) {
    if (!confirm(`Remove ${username} from this workspace?`)) return
    try {
      await api.delete(`/api/workspaces/${wid}/members/${memberId}`)
      setMembers(m => m.filter(x => x.id !== memberId))
      toast.info(`${username} removed`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove member')
    }
  }

  return (
    <div className="page" style={{ maxWidth: 680 }}>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}

      <div className="page-header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
        <h2 className="page-title">Settings</h2>
      </div>

      {/* Workspace info */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
          Workspace
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--primary-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-primary)', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" /></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName && isAdmin ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  autoFocus
                  value={wsName}
                  onChange={e => setWsName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false) }}
                  style={{ flex: 1, fontSize: 14, fontWeight: 600 }}
                />
                <button onClick={handleRename} className="btn-primary" style={{ fontSize: 12 }}>Save</button>
                <button onClick={() => setEditingName(false)} className="btn-ghost" style={{ fontSize: 12 }}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{currentWorkspace?.name}</span>
                {isAdmin && (
                  <button onClick={() => setEditingName(true)} className="btn-icon" title="Rename workspace" style={{ opacity: 0.6 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                )}
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {members.length} member{members.length !== 1 ? 's' : ''} · Your role: <span style={{ color: ROLE_COLORS[currentWorkspace?.role] }}>{ROLE_LABELS[currentWorkspace?.role]}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Members
          </div>
          {isAdmin && (
            <button onClick={() => setShowInvite(true)} className="btn-primary" style={{ fontSize: 12, padding: '5px 12px' }}>
              + Invite
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {members.map(m => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px',
              background: 'var(--bg-3)', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
            }}>
              <Avatar name={m.username} color={m.avatar_color} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {m.username}
                  {m.id === user?.id && (
                    <span style={{ fontSize: 10, background: 'var(--bg-4)', border: '1px solid var(--border)', color: 'var(--text-subtle)', borderRadius: 4, padding: '0 5px' }}>you</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
              </div>
              {isAdmin && m.id !== user?.id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <select
                    value={m.role}
                    onChange={e => handleRoleChange(m.id, e.target.value)}
                    style={{ fontSize: 12, padding: '4px 8px', color: ROLE_COLORS[m.role] }}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={() => handleRemove(m.id, m.username)}
                    className="btn-icon"
                    title="Remove member"
                    style={{ color: 'var(--danger)', opacity: 0.7 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                  </button>
                </div>
              ) : (
                <div style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                  background: `${ROLE_COLORS[m.role]}15`,
                  border: `1px solid ${ROLE_COLORS[m.role]}30`,
                  color: ROLE_COLORS[m.role],
                }}>
                  {ROLE_LABELS[m.role]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
