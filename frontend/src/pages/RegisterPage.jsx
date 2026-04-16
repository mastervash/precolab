import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({ email: '', username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/register', form)
      setAuth(data.user, [data.workspace], data.accessToken, data.refreshToken)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="card" style={{ width: 400, padding: 32 }}>
        <h1 style={{ marginBottom: 8, fontSize: 24, fontWeight: 700 }}>Create Account</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Join PrecoLab</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label>Email</label>
            <input type="email" required autoFocus
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label>Username</label>
            <input type="text" required minLength={2} maxLength={30} pattern="[a-zA-Z0-9_-]+"
              placeholder="letters, numbers, _ -"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          </div>
          <div>
            <label>Password</label>
            <input type="password" required minLength={8}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
        <p style={{ marginTop: 16, color: 'var(--text-muted)', textAlign: 'center' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
