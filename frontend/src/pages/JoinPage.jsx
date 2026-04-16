import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'

const ROLE_DESC = { admin: 'Full access', editor: 'Can edit content', viewer: 'Read-only access' }

export default function JoinPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite')
  const { user, workspaces, setAuth, accessToken, refreshToken } = useAuthStore()

  const [invite, setInvite] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    if (!inviteToken) { setError('No invite token found in URL.'); return }
    api.get(`/api/auth/invite/${inviteToken}`)
      .then(r => setInvite(r.data))
      .catch(err => setError(err.response?.data?.error || 'Invalid or expired invite link'))
  }, [inviteToken])

  async function handleAccept() {
    setLoading(true)
    try {
      const { data } = await api.post(`/api/auth/invite/${inviteToken}/accept`)
      // Add the new workspace to the store
      const updatedWorkspaces = [...workspaces, { ...data.workspace, role: data.role }]
      setAuth(user, updatedWorkspaces, accessToken, refreshToken)
      setJoined(true)
      setTimeout(() => navigate('/'), 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join workspace')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: 'var(--bg)',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative blobs */}
      <div style={{ position: 'absolute', top: -150, right: -150, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,111,253,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--primary-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-primary)' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.03em', color: 'var(--text)' }}>PrecoLab</span>
        </div>

        {error ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(240,69,90,0.1)', border: '1px solid rgba(240,69,90,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6L6 18 M6 6l12 12" /></svg>
            </div>
            <h2 style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>Invalid Invite</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>{error}</p>
            <Link to="/" style={{ fontWeight: 500, fontSize: 13 }}>Go to dashboard →</Link>
          </div>
        ) : joined ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h2 style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>You're in!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Joined {invite?.workspaceName}. Redirecting…</p>
          </div>
        ) : !invite ? (
          /* Loading skeleton */
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 28 }}>
            <div style={{ height: 20, width: '60%', background: 'var(--bg-3)', borderRadius: 6, marginBottom: 12 }} />
            <div style={{ height: 14, width: '40%', background: 'var(--bg-3)', borderRadius: 6 }} />
          </div>
        ) : (
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border-hover)', borderRadius: 'var(--radius-xl)', padding: 32, boxShadow: 'var(--shadow-lg)' }}>
            {/* Workspace info */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--primary-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: 'var(--shadow-primary)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" /></svg>
              </div>
              <h2 style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 6 }}>
                {invite.workspaceName}
              </h2>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--primary-dim)', border: '1px solid rgba(124,111,253,0.2)', borderRadius: 999, padding: '4px 12px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>
                  {invite.role} · {ROLE_DESC[invite.role]}
                </span>
              </div>
            </div>

            {user ? (
              /* Logged-in: show accept button */
              <>
                <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                  Signed in as <strong style={{ color: 'var(--text)' }}>{user.username}</strong>
                </p>
                <button
                  onClick={handleAccept}
                  className="btn-primary"
                  disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14 }}
                >
                  {loading ? (
                    <>
                      <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />
                      Joining…
                    </>
                  ) : `Accept & join workspace`}
                </button>
              </>
            ) : (
              /* Not logged in: show register/login options */
              <>
                <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                  Create an account or sign in to accept this invite
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Link
                    to={`/register?invite=${inviteToken}`}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '11px', borderRadius: 'var(--radius)',
                      background: 'var(--primary-grad)', color: '#fff',
                      fontWeight: 600, fontSize: 14, textDecoration: 'none',
                      boxShadow: 'var(--shadow-primary)',
                      transition: 'opacity var(--t-fast)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    Create account
                  </Link>
                  <Link
                    to={`/login?invite=${inviteToken}`}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '11px', borderRadius: 'var(--radius)',
                      background: 'var(--bg-3)', border: '1px solid var(--border)',
                      color: 'var(--text-muted)', fontWeight: 500, fontSize: 14,
                      textDecoration: 'none', transition: 'all var(--t-fast)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    Sign in to existing account
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
