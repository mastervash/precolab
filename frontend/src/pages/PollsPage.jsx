import React, { useEffect, useState } from 'react'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'
import { toast } from '../components/ui/Toast.jsx'

export default function PollsPage() {
  const { currentWorkspace, user } = useAuthStore()
  const [polls, setPolls] = useState([])
  const [creating, setCreating] = useState(false)
  const [newPoll, setNewPoll] = useState({ question: '', options: ['', ''] })
  const wid = currentWorkspace?.id

  const load = () => api.get(`/api/workspaces/${wid}/polls`).then(r => setPolls(r.data))
  useEffect(() => { if (wid) load() }, [wid])

  async function submitPoll() {
    const opts = newPoll.options.filter(o => o.trim())
    if (!newPoll.question.trim() || opts.length < 2) {
      toast.warn('Need a question and at least 2 options')
      return
    }
    await api.post(`/api/workspaces/${wid}/polls`, { question: newPoll.question.trim(), options: opts })
    toast.success('Poll created')
    setCreating(false)
    setNewPoll({ question: '', options: ['', ''] })
    load()
  }

  async function vote(pollId, optionId) {
    await api.post(`/api/workspaces/${wid}/polls/${pollId}/vote`, { optionId })
    load()
  }

  async function deletePoll(id) {
    await api.delete(`/api/workspaces/${wid}/polls/${id}`)
    setPolls(p => p.filter(x => x.id !== id))
    toast.info('Poll deleted')
  }

  return (
    <div className="page" style={{ maxWidth: 680 }}>
      <div className="page-header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 20V10 M12 20V4 M6 20v-6" /></svg>
        <h2 className="page-title">Polls</h2>
        <div style={{ flex: 1 }} />
        <button onClick={() => setCreating(c => !c)} className={creating ? 'btn-ghost' : 'btn-primary'} style={{ fontSize: 12 }}>
          {creating ? 'Cancel' : '+ New Poll'}
        </button>
      </div>

      {creating && (
        <div className="card" style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3 style={{ fontWeight: 600, fontSize: 14 }}>New poll</h3>
          <div>
            <label>Question</label>
            <input value={newPoll.question} onChange={e => setNewPoll(p => ({ ...p, question: e.target.value }))} placeholder="Ask the team something…" autoFocus />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label>Options</label>
            {newPoll.options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: 8 }}>
                <input value={opt} onChange={e => setNewPoll(p => { const o = [...p.options]; o[i] = e.target.value; return { ...p, options: o } })} placeholder={`Option ${i + 1}`} style={{ flex: 1 }} />
                {newPoll.options.length > 2 && (
                  <button onClick={() => setNewPoll(p => ({ ...p, options: p.options.filter((_, j) => j !== i) }))} className="btn-icon">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18 M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            ))}
            {newPoll.options.length < 10 && (
              <button onClick={() => setNewPoll(p => ({ ...p, options: [...p.options, ''] }))} className="btn-ghost" style={{ fontSize: 12, alignSelf: 'flex-start' }}>
                + Add option
              </button>
            )}
          </div>
          <button onClick={submitPoll} className="btn-primary" style={{ alignSelf: 'flex-end', fontSize: 13 }}>Create Poll</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {polls.length === 0 && !creating && (
          <div className="empty-state" style={{ marginTop: 32 }}>
            <div className="empty-state-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M18 20V10 M12 20V4 M6 20v-6" /></svg>
            </div>
            <div className="empty-state-title">No polls yet</div>
            <div className="empty-state-desc">Create a poll to gather your team's opinion</div>
            <button onClick={() => setCreating(true)} className="btn-primary" style={{ marginTop: 8 }}>Create Poll</button>
          </div>
        )}
        {polls.map(poll => {
          const total = poll.options.reduce((s, o) => s + (o.vote_count || 0), 0)
          return (
            <div key={poll.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>{poll.question}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    by {poll.username} · {total} vote{total !== 1 ? 's' : ''}
                    {poll.closes_at && ` · closes ${new Date(poll.closes_at).toLocaleDateString()}`}
                  </div>
                </div>
                {poll.created_by === user?.id && (
                  <button onClick={() => deletePoll(poll.id)} className="btn-icon" title="Delete poll">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18 M19 6l-1 14H6L5 6 M8 6V4h8v2" /></svg>
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {poll.options.map(opt => {
                  const pct = total > 0 ? Math.round((opt.vote_count / total) * 100) : 0
                  const isVoted = poll.userVote === opt.id
                  return (
                    <div key={opt.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
                        <button
                          onClick={() => !poll.userVote && vote(poll.id, opt.id)}
                          style={{
                            background: 'none', padding: 0, border: 'none',
                            color: isVoted ? 'var(--primary)' : 'var(--text-2)',
                            fontWeight: isVoted ? 600 : 400,
                            fontSize: 13,
                            cursor: poll.userVote ? 'default' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: 7,
                          }}
                        >
                          <div style={{
                            width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                            border: `2px solid ${isVoted ? 'var(--primary)' : 'var(--border-hover)'}`,
                            background: isVoted ? 'var(--primary)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all var(--t)',
                          }}>
                            {isVoted && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
                          </div>
                          {opt.text}
                        </button>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: isVoted ? 600 : 400, color: isVoted ? 'var(--primary)' : 'var(--text-muted)' }}>
                          {pct}%
                        </span>
                      </div>
                      <div style={{ height: 5, background: 'var(--bg-4)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          width: `${pct}%`,
                          background: isVoted ? 'var(--primary-grad)' : 'var(--bg-hover)',
                          transition: 'width 0.4s ease',
                          boxShadow: isVoted ? 'var(--shadow-primary)' : 'none',
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
