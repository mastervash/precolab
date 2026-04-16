import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({ email: '', username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const inviteToken = searchParams.get('invite')
  const [invite, setInvite] = useState(null)      // { workspaceName, role }
  const [inviteError, setInviteError] = useState('')

  // Look up invite metadata so the page can show workspace context
  useEffect(() => {
    if (!inviteToken) return
    api.get(`/api/auth/invite/${inviteToken}`)
      .then(r => setInvite(r.data))
      .catch(err => setInviteError(err.response?.data?.error || 'Invalid invite link'))
  }, [inviteToken])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const payload = { ...form, ...(inviteToken ? { inviteToken } : {}) }
      const { data } = await api.post('/api/auth/register', payload)
      setAuth(data.user, data.workspaces, data.accessToken, data.refreshToken)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = form.password.length === 0 ? null
    : form.password.length < 8 ? 'weak'
    : form.password.length < 12 ? 'fair'
    : 'strong'

  const strengthColor = { weak: 'var(--danger)', fair: 'var(--warn)', strong: 'var(--success)' }
  const strengthWidth = { weak: '33%', fair: '66%', strong: '100%' }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--bg)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Decorative blobs */}
      <div style={{
        position: 'absolute', top: -150, right: -150,
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,111,253,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -100, left: -100,
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(167,139,250,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: 'var(--primary-grad)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-primary)',
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5" />
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.03em', color: 'var(--text)' }}>PrecoLab</span>
          </div>

          {/* Invite banner or default heading */}
          {inviteToken ? (
            <div style={{ marginBottom: 24 }}>
              {inviteError ? (
                <div style={{
                  padding: '12px 14px',
                  background: 'rgba(240,69,90,0.08)',
                  border: '1px solid rgba(240,69,90,0.25)',
                  borderRadius: 'var(--radius-lg)',
                  color: 'var(--danger)',
                  fontSize: 13,
                  marginBottom: 8,
                }}>
                  {inviteError}
                </div>
              ) : invite ? (
                <div style={{
                  padding: '14px 16px',
                  background: 'var(--primary-dim)',
                  border: '1px solid rgba(124,111,253,0.25)',
                  borderRadius: 'var(--radius-lg)',
                  marginBottom: 8,
                }}>
                  <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    You've been invited
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                    {invite.workspaceName}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    You'll join as <strong style={{ color: 'var(--text)' }}>{invite.role}</strong>
                  </div>
                </div>
              ) : (
                <div style={{ height: 72, background: 'var(--bg-3)', borderRadius: 'var(--radius-lg)', marginBottom: 8 }} />
              )}
              <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: 4 }}>
                Create your account
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Register to accept the invite
              </p>
            </div>
          ) : (
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: 6 }}>
                Create your account
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Get started with your team workspace in seconds
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label>Email address</label>
              <input
                type="email" required autoFocus
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div>
              <label>Username</label>
              <input
                type="text" required minLength={2} maxLength={30} pattern="[a-zA-Z0-9_-]+"
                placeholder="your_username"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              />
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-subtle)' }}>
                Letters, numbers, underscores and hyphens only
              </div>
            </div>

            <div>
              <label>Password</label>
              <input
                type="password" required minLength={8}
                placeholder="Minimum 8 characters"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
              {passwordStrength && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ height: 3, background: 'var(--bg-4)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      width: strengthWidth[passwordStrength],
                      background: strengthColor[passwordStrength],
                      transition: 'width 0.3s ease, background 0.3s ease',
                    }} />
                  </div>
                  <div style={{ marginTop: 4, fontSize: 11, color: strengthColor[passwordStrength] }}>
                    {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)} password
                  </div>
                </div>
              )}
            </div>

            {error && <div className="error-msg">{error}</div>}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || (inviteToken && !!inviteError)}
              style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', fontSize: 14, marginTop: 4 }}
            >
              {loading ? (
                <>
                  <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />
                  Creating account…
                </>
              ) : inviteToken ? 'Create account & join workspace' : 'Create account'}
            </button>
          </form>

          <p style={{ marginTop: 24, color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: 500 }}>Sign in</Link>
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
