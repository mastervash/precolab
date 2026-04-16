import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'

export default function ChatPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { currentWorkspace, user, accessToken } = useAuthStore()
  const [rooms, setRooms] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [activeRoom, setActiveRoom] = useState(null)
  const [newRoomName, setNewRoomName] = useState('')
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
    connectWs(room.id)
  }

  function connectWs(rid) {
    wsRef.current?.close()
    const apiBase = import.meta.env.VITE_API_URL || ''
    // Chat WS is served under the REST API prefix, not /ws
    const wsBase = apiBase.replace(/^http/, 'ws')
    const ws = new WebSocket(`${wsBase}/api/workspaces/${wid}/chat/rooms/${rid}/ws?token=${accessToken}`)
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        setMessages(m => [...m, msg])
      } catch {}
    }
    wsRef.current = ws
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
    selectRoom(data)
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Room list */}
      <div style={{ width: 200, borderRight: '1px solid var(--border)', padding: 12, overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Channels</div>
        {rooms.map(r => (
          <div key={r.id} onClick={() => selectRoom(r)}
            style={{
              padding: '6px 8px', borderRadius: 6, cursor: 'pointer', marginBottom: 2,
              background: activeRoom?.id === r.id ? 'rgba(99,102,241,0.1)' : 'transparent',
              color: activeRoom?.id === r.id ? 'var(--primary)' : 'var(--text-muted)',
            }}>
            # {r.name}
          </div>
        ))}
        <div style={{ marginTop: 12, display: 'flex', gap: 4 }}>
          <input value={newRoomName} onChange={e => setNewRoomName(e.target.value)}
            placeholder="New channel…" style={{ flex: 1, fontSize: 12 }}
            onKeyDown={e => e.key === 'Enter' && createRoom()} />
          <button onClick={createRoom} className="btn-ghost" style={{ padding: '4px 8px' }}>+</button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeRoom ? (
          <>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
              # {activeRoom.name}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {messages.map((msg, i) => {
                const isMe = msg.author_id === user?.id
                return (
                  <div key={msg.id || i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: msg.avatar_color || 'var(--primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: '#fff',
                    }}>
                      {msg.username?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{msg.username}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{formatTime(msg.created_at)}</span>
                      </div>
                      <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '6px 10px', display: 'inline-block', maxWidth: 480, wordBreak: 'break-word' }}>
                        {msg.body}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
            <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <input
                value={input} onChange={e => setInput(e.target.value)}
                placeholder={`Message #${activeRoom.name}…`}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                style={{ flex: 1 }}
              />
              <button onClick={sendMessage} className="btn-primary">Send</button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Select a channel
          </div>
        )}
      </div>
    </div>
  )
}
