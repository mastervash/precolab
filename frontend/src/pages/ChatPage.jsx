import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'

const Icon = ({ d, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

function Avatar({ name, color, size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${color || '#7c6ffd'}, ${color ? color + 'aa' : '#a78bfa'})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.38, color: '#fff',
    }}>
      {name?.[0]?.toUpperCase()}
    </div>
  )
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ChatPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { currentWorkspace, user, accessToken } = useAuthStore()
  const [rooms, setRooms] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [activeRoom, setActiveRoom] = useState(null)
  const [newRoomName, setNewRoomName] = useState('')
  const [showNewRoom, setShowNewRoom] = useState(false)
  const wsRef = useRef(null)
  const bottomRef = useRef(null)
  const wid = currentWorkspace?.id

  useEffect(() => {
    if (!wid) return
    api.get(`/api/workspaces/${wid}/chat/rooms`).then(r => {
      setRooms(r.data)
      const target = roomId ? r.data.find(x => x.id === roomId) : r.data[0]
      if (target) selectRoom(target)
    })
  }, [wid])

  function selectRoom(room) {
    setActiveRoom(room)
    navigate(`/chat/${room.id}`)
    setMessages([])
    api.get(`/api/workspaces/${wid}/chat/rooms/${room.id}/messages`).then(r => setMessages(r.data))
    wsRef.current?.close()
    const apiBase = import.meta.env.VITE_API_URL || ''
    const wsBase = apiBase.replace(/^http/, 'ws')
    const ws = new WebSocket(`${wsBase}/api/workspaces/${wid}/chat/rooms/${room.id}/ws?token=${accessToken}`)
    ws.onmessage = (e) => {
      try { setMessages(m => [...m, JSON.parse(e.data)]) } catch {}
    }
    wsRef.current = ws
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  function sendMessage() {
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== 1) return
    wsRef.current.send(JSON.stringify({ type: 'message', body: input.trim() }))
    setInput('')
  }

  async function createRoom() {
    if (!newRoomName.trim()) return
    const { data } = await api.post(`/api/workspaces/${wid}/chat/rooms`, { name: newRoomName.trim() })
    setRooms(r => [...r, data])
    setNewRoomName('')
    setShowNewRoom(false)
    selectRoom(data)
  }

  // Group consecutive messages by same author
  const grouped = messages.reduce((acc, msg, i) => {
    const prev = messages[i - 1]
    const isFirst = !prev || prev.author_id !== msg.author_id ||
      new Date(msg.created_at) - new Date(prev.created_at) > 300000
    acc.push({ ...msg, isFirst })
    return acc
  }, [])

  return (
    <div className="panel-layout">
      {/* Sidebar */}
      <div className="panel-sidebar">
        <div className="panel-sidebar-header">
          <span className="panel-sidebar-title">Channels</span>
          <button onClick={() => setShowNewRoom(s => !s)} className="btn-icon" title="New channel">
            <Icon d="M12 5v14 M5 12h14" size={14} />
          </button>
        </div>

        {showNewRoom && (
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
            <input
              autoFocus
              value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)}
              placeholder="channel-name"
              style={{ marginBottom: 6 }}
              onKeyDown={e => { if (e.key === 'Enter') createRoom(); if (e.key === 'Escape') setShowNewRoom(false) }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={createRoom} className="btn-primary" style={{ flex: 1, padding: '5px', fontSize: 12, justifyContent: 'center' }}>Create</button>
              <button onClick={() => setShowNewRoom(false)} className="btn-ghost" style={{ padding: '5px 8px', fontSize: 12 }}>Cancel</button>
            </div>
          </div>
        )}

        <div className="panel-sidebar-list">
          {rooms.map(r => (
            <div
              key={r.id}
              onClick={() => selectRoom(r)}
              className={`panel-sidebar-item ${activeRoom?.id === r.id ? 'active' : ''}`}
            >
              <span style={{ color: 'var(--text-subtle)', fontSize: 13, fontWeight: 500 }}>#</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="panel-content">
        {activeRoom ? (
          <>
            <div className="panel-topbar">
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>#</span>
              <span className="panel-topbar-title">{activeRoom.name}</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {grouped.map((msg, i) => (
                <div key={msg.id || i}>
                  {msg.isFirst && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 16 }}>
                      <Avatar name={msg.username} color={msg.avatar_color} size={30} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 3 }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{msg.username}</span>
                          <span style={{ color: 'var(--text-subtle)', fontSize: 11 }}>{formatTime(msg.created_at)}</span>
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5, wordBreak: 'break-word' }}>{msg.body}</div>
                      </div>
                    </div>
                  )}
                  {!msg.isFirst && (
                    <div style={{ paddingLeft: 40, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5, wordBreak: 'break-word', marginTop: 1 }}>
                      {msg.body}
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-2)' }}>
              <div style={{
                display: 'flex', gap: 8, alignItems: 'center',
                background: 'var(--bg-3)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: '6px 6px 6px 14px',
                transition: 'border-color var(--t)',
              }}
                onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--border-focus)'}
                onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={`Message #${activeRoom.name}…`}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  style={{ flex: 1, background: 'transparent', border: 'none', padding: 0, fontSize: 13, boxShadow: 'none' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                    background: input.trim() ? 'var(--primary-grad)' : 'var(--bg-4)',
                    color: input.trim() ? '#fff' : 'var(--text-muted)',
                    border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                    transition: 'all var(--t)', boxShadow: input.trim() ? 'var(--shadow-primary)' : 'none',
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            </div>
            <div className="empty-state-title">Select a channel</div>
            <div className="empty-state-desc">Pick a channel from the sidebar to start chatting</div>
          </div>
        )}
      </div>
    </div>
  )
}
