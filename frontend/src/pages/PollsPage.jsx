import React, { useEffect, useState } from 'react'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'

export default function PollsPage() {
  const { currentWorkspace, user } = useAuthStore()
  const [polls, setPolls] = useState([])
  const [creating, setCreating] = useState(false)
  const [newPoll, setNewPoll] = useState({ question: '', options: ['', ''] })
  const wid = currentWorkspace?.id

  useEffect(() => {
    if (!wid) return
    api.get(`/api/workspaces/${wid}/polls`).then(r => setPolls(r.data))
  }, [wid])

  async function submitPoll() {
    const opts = newPoll.options.filter(o => o.trim())
    if (!newPoll.question.trim() || opts.length < 2) return
    const { data } = await api.post(`/api/workspaces/${wid}/polls`, {
      question: newPoll.question.trim(),
      options: opts,
    })
    api.get(`/api/workspaces/${wid}/polls`).then(r => setPolls(r.data))
    setCreating(false)
    setNewPoll({ question: '', options: ['', ''] })
  }

  async function vote(pollId, optionId) {
    await api.post(`/api/workspaces/${wid}/polls/${pollId}/vote`, { optionId })
    api.get(`/api/workspaces/${wid}/polls`).then(r => setPolls(r.data))
  }

  async function deletePoll(id) {
    await api.delete(`/api/workspaces/${wid}/polls/${id}`)
    setPolls(p => p.filter(x => x.id !== id))
  }

  function totalVotes(options) {
    return options.reduce((s, o) => s + (o.vote_count || 0), 0)
  }

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, fontSize: 18 }}>Polls</h2>
        <button onClick={() => setCreating(c => !c)} className="btn-primary">
          {creating ? 'Cancel' : '+ New Poll'}
        </button>
      </div>

      {creating && (
        <div className="card" style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ fontWeight: 600 }}>Create Poll</h3>
          <input
            value={newPoll.question}
            onChange={e => setNewPoll(p => ({ ...p, question: e.target.value }))}
            placeholder="Ask a question…"
          />
          {newPoll.options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 8 }}>
              <input
                value={opt}
                onChange={e => setNewPoll(p => {
                  const opts = [...p.options]; opts[i] = e.target.value; return { ...p, options: opts }
                })}
                placeholder={`Option ${i + 1}`}
                style={{ flex: 1 }}
              />
              {newPoll.options.length > 2 && (
                <button onClick={() => setNewPoll(p => ({ ...p, options: p.options.filter((_, j) => j !== i) }))}
                  className="btn-ghost" style={{ padding: '6px 10px' }}>×</button>
              )}
            </div>
          ))}
          {newPoll.options.length < 10 && (
            <button onClick={() => setNewPoll(p => ({ ...p, options: [...p.options, ''] }))}
              className="btn-ghost">+ Option</button>
          )}
          <button onClick={submitPoll} className="btn-primary">Create Poll</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {polls.map(poll => {
          const total = totalVotes(poll.options)
          return (
            <div key={poll.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontWeight: 600 }}>{poll.question}</h3>
                {poll.created_by === user?.id && (
                  <button onClick={() => deletePoll(poll.id)} className="btn-ghost" style={{ color: 'var(--danger)', padding: '4px 8px', fontSize: 13 }}>Delete</button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {poll.options.map(opt => {
                  const pct = total > 0 ? Math.round((opt.vote_count / total) * 100) : 0
                  const isVoted = poll.userVote === opt.id
                  return (
                    <div key={opt.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <button
                          onClick={() => !poll.userVote && vote(poll.id, opt.id)}
                          style={{
                            background: 'none', padding: 0, border: 'none',
                            color: isVoted ? 'var(--primary)' : 'var(--text)',
                            fontWeight: isVoted ? 700 : 400,
                            cursor: poll.userVote ? 'default' : 'pointer',
                            textAlign: 'left',
                          }}>
                          {isVoted ? '● ' : '○ '}{opt.text}
                        </button>
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{pct}% ({opt.vote_count})</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: isVoted ? 'var(--primary)' : 'var(--border)', borderRadius: 3, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 12 }}>
                {total} vote{total !== 1 ? 's' : ''} · by {poll.username}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
