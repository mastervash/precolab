import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore.js'
import api from '../../api/client.js'

const NAV = [
  { to: '/',          icon: '⬡',  label: 'Dashboard' },
  { to: '/kanban',    icon: '▦',  label: 'Kanban' },
  { to: '/docs',      icon: '📄', label: 'Docs' },
  { to: '/todos',     icon: '✓',  label: 'To-Do' },
  { to: '/chat',      icon: '💬', label: 'Chat' },
  { to: '/whiteboard',icon: '✏️', label: 'Whiteboard' },
  { to: '/mindmap',   icon: '🧠', label: 'Mind Map' },
  { to: '/images',    icon: '🖼', label: 'Images' },
  { to: '/files',     icon: '📁', label: 'Files' },
  { to: '/calendar',  icon: '📅', label: 'Calendar' },
  { to: '/polls',     icon: '📊', label: 'Polls' },
  { to: '/activity',  icon: '⚡', label: 'Activity' },
]

export default function WorkspaceShell({ children }) {
  const { user, currentWorkspace, workspaces, setCurrentWorkspace, logout } = useAuthStore()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  async function handleLogout() {
    const refreshToken = useAuthStore.getState().refreshToken
    await api.post('/api/auth/logout', { refreshToken }).catch(() => {})
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 56 : 220,
        background: 'var(--bg-2)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {/* Logo + collapse */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 12px', borderBottom: '1px solid var(--border)' }}>
          {!collapsed && <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--primary)' }}>PrecoLab</span>}
          <button onClick={() => setCollapsed(c => !c)} className="btn-ghost" style={{ padding: '4px 8px', fontSize: 16, minWidth: 32 }}>
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* Workspace selector */}
        {!collapsed && (
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
            <label>Workspace</label>
            <select
              value={currentWorkspace?.id || ''}
              onChange={e => setCurrentWorkspace(workspaces.find(w => w.id === e.target.value))}
              style={{ marginTop: 4 }}
            >
              {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                fontSize: 14,
              })}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && item.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: user?.avatarColor || 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0,
          }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          {!collapsed && (
            <>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.username}</span>
              <button onClick={handleLogout} className="btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }}>Out</button>
            </>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  )
}
