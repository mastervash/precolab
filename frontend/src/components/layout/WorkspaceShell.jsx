import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore.js'
import { useThemeStore } from '../../store/themeStore.js'
import api from '../../api/client.js'
import InviteModal from '../ui/InviteModal.jsx'

/* ─── SVG Icons ──────────────────────────────────────────────── */
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const ICONS = {
  dashboard: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  kanban:    'M3 3h6v18H3z M9 3h6v10H9z M15 3h6v14h-6z',
  docs:      'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  todos:     'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  chat:      'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  whiteboard:'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
  mindmap:   'M6 3v12 M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M15 6a9 9 0 0 1-9 9',
  images:    'M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M21 15l-5-5L5 21',
  files:     'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
  calendar:  'M3 4h18v18H3z M16 2v4 M8 2v4 M3 10h18',
  polls:     'M18 20V10 M12 20V4 M6 20v-6',
  activity:  'M22 12h-4l-3 9L9 3l-3 9H2',
  collapse:  'M15 18l-6-6 6-6',
  expand:    'M9 18l6-6-6-6',
  logout:    'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  workspace: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
}

const NAV = [
  { to: '/',           icon: 'dashboard',   label: 'Dashboard' },
  { to: '/kanban',     icon: 'kanban',      label: 'Kanban' },
  { to: '/docs',       icon: 'docs',        label: 'Docs' },
  { to: '/todos',      icon: 'todos',       label: 'To-Do' },
  { to: '/chat',       icon: 'chat',        label: 'Chat' },
  { to: '/whiteboard', icon: 'whiteboard',  label: 'Whiteboard' },
  { to: '/mindmap',    icon: 'mindmap',     label: 'Mind Map' },
  { to: '/images',     icon: 'images',      label: 'Images' },
  { to: '/files',      icon: 'files',       label: 'Files' },
  { to: '/calendar',   icon: 'calendar',    label: 'Calendar' },
  { to: '/polls',      icon: 'polls',       label: 'Polls' },
  { to: '/activity',   icon: 'activity',    label: 'Activity' },
]

/* ─── Avatar ─────────────────────────────────────────────────── */
function Avatar({ name, color, size = 30 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${color || '#7c6ffd'}, ${color ? color + 'cc' : '#a78bfa'})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.4, color: '#fff',
      flexShrink: 0, letterSpacing: '-0.02em',
      boxShadow: `0 0 0 2px rgba(0,0,0,0.3)`,
    }}>
      {name?.[0]?.toUpperCase()}
    </div>
  )
}

/* ─── Shell ──────────────────────────────────────────────────── */
export default function WorkspaceShell({ children }) {
  const { user, currentWorkspace, workspaces, setCurrentWorkspace, logout } = useAuthStore()
  const { theme, setTheme } = useThemeStore()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [showInvite, setShowInvite] = useState(false)

  const THEME_CYCLE = { dark: 'dim', dim: 'light', light: 'dark' }
  const THEME_ICON = {
    dark:  'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
    dim:   'M12 3v1 M12 20v1 M4.22 4.22l.71.71 M18.36 18.36l.71.71 M3 12h1 M20 12h1 M4.22 19.78l.71-.71 M18.36 5.64l.71-.71 M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z',
    light: 'M12 3v1 M12 20v1 M4.22 4.22l.71.71 M18.36 18.36l.71.71 M3 12h1 M20 12h1 M4.22 19.78l.71-.71 M18.36 5.64l.71-.71 M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z',
  }

  async function handleLogout() {
    const refreshToken = useAuthStore.getState().refreshToken
    await api.post('/api/auth/logout', { refreshToken }).catch(() => {})
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside style={{
        width: collapsed ? 60 : 228,
        background: 'var(--bg-2)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width var(--t-slow)',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
      }}>

        {/* Logo row */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: '16px 14px',
          borderBottom: '1px solid var(--border)',
          minHeight: 57,
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              {/* Logo mark */}
              <div style={{
                width: 26, height: 26, borderRadius: 7,
                background: 'var(--primary-grad)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--shadow-primary)',
                flexShrink: 0,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5" />
                </svg>
              </div>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                PrecoLab
              </span>
            </div>
          )}
          {collapsed && (
            <div style={{
              width: 26, height: 26, borderRadius: 7,
              background: 'var(--primary-grad)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5" />
              </svg>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="btn-icon"
              title="Collapse sidebar"
            >
              <Icon d={ICONS.collapse} size={15} />
            </button>
          )}
        </div>

        {/* Collapse toggle when collapsed */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="btn-icon"
            style={{ margin: '8px auto', padding: '6px' }}
            title="Expand sidebar"
          >
            <Icon d={ICONS.expand} size={15} />
          </button>
        )}

        {/* Workspace selector */}
        {!collapsed && (
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Workspace
            </div>
            <select
              value={currentWorkspace?.id || ''}
              onChange={e => setCurrentWorkspace(workspaces.find(w => w.id === e.target.value))}
              style={{ padding: '6px 8px', fontSize: 12, fontWeight: 500 }}
            >
              {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              title={collapsed ? item.label : undefined}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: collapsed ? '9px' : '8px 10px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                background: isActive ? 'var(--primary-dim)' : 'transparent',
                borderRadius: 'var(--radius)',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                transition: 'all var(--t-fast)',
                boxShadow: isActive ? 'inset 0 0 0 1px rgba(124,111,253,0.15)' : 'none',
              })}
              onMouseEnter={e => { if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '' }}
            >
              <span style={{ flexShrink: 0, display: 'flex' }}>
                <Icon d={ICONS[item.icon]} size={15} />
              </span>
              {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div style={{
          padding: '10px 10px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <Avatar name={user?.username} color={user?.avatarColor} size={28} />
          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.username}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </div>
              </div>
              <button
                onClick={() => setShowInvite(true)}
                className="btn-icon"
                title="Invite member"
                style={{ flexShrink: 0 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M19 8v6 M22 11h-6" /></svg>
              </button>
              <button
                onClick={() => setTheme(THEME_CYCLE[theme])}
                className="btn-icon"
                title={`Theme: ${theme}`}
                style={{ flexShrink: 0 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d={THEME_ICON[theme]} />
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="btn-icon"
                title="Sign out"
                style={{ flexShrink: 0 }}
              >
                <Icon d={ICONS.logout} size={14} />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
        {children}
      </main>
    </div>
  )
}
