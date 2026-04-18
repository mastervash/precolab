import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'

// Lazy load Excalidraw to avoid SSR issues
const ExcalidrawWrapper = React.lazy(() =>
  import('@excalidraw/excalidraw').then(mod => ({
    default: function ExcalidrawWrapped({ boardId, accessToken }) {
      const { Excalidraw } = mod
      const [elements, setElements] = React.useState([])
      const wsRef = React.useRef(null)

      React.useEffect(() => {
        const wsBase = import.meta.env.VITE_WS_URL || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`
        const ws = new WebSocket(`${wsBase}/ws/collab/whiteboard:${boardId}?token=${accessToken}`)
        ws.binaryType = 'arraybuffer'
        wsRef.current = ws
        return () => ws.close()
      }, [boardId])

      return (
        <div style={{ height: '100%' }}>
          <Excalidraw
            initialData={{ elements }}
            onChange={(els) => setElements(els)}
          />
        </div>
      )
    },
  }))
)

export default function WhiteboardPage() {
  const { boardId } = useParams()
  const navigate = useNavigate()
  const { currentWorkspace, accessToken } = useAuthStore()
  const [boards, setBoards] = useState([])
  const [activeBoard, setActiveBoard] = useState(null)
  const wid = currentWorkspace?.id

  useEffect(() => {
    if (!wid) return
    api.get(`/api/workspaces/${wid}/whiteboards`).then(r => {
      setBoards(r.data)
      const target = boardId ? r.data.find(b => b.id === boardId) : null
      if (target) setActiveBoard(target)
    })
  }, [wid, boardId])

  async function createBoard() {
    const { data } = await api.post(`/api/workspaces/${wid}/whiteboards`, { title: 'New Whiteboard' })
    setBoards(b => [data, ...b])
    setActiveBoard(data)
    navigate(`/whiteboard/${data.id}`)
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Sidebar */}
      <div style={{
        width: 220, flexShrink: 0,
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-2)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 14px 10px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round"><path d="M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>Whiteboards</span>
          </div>
          <button onClick={createBoard} className="btn-icon" title="New whiteboard" style={{ color: 'var(--primary)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14 M5 12h14" /></svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {boards.length === 0 && (
            <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: 12 }}>
              No whiteboards yet
            </div>
          )}
          {boards.map(b => (
            <button key={b.id}
              onClick={() => { setActiveBoard(b); navigate(`/whiteboard/${b.id}`) }}
              style={{
                width: '100%', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 'var(--radius)',
                border: 'none', cursor: 'pointer', marginBottom: 1,
                background: activeBoard?.id === b.id ? 'var(--primary-dim)' : 'transparent',
                color: activeBoard?.id === b.id ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: 13, fontWeight: activeBoard?.id === b.id ? 500 : 400,
                transition: 'all var(--t-fast)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                boxShadow: activeBoard?.id === b.id ? 'inset 0 0 0 1px rgba(124,111,253,0.15)' : 'none',
              }}
              onMouseEnter={e => { if (activeBoard?.id !== b.id) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (activeBoard?.id !== b.id) e.currentTarget.style.background = 'transparent' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Canvas area */}
      <div style={{ flex: 1, overflow: 'hidden', background: 'var(--bg)' }}>
        {activeBoard ? (
          <React.Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 13 }}>
              Loading whiteboard…
            </div>
          }>
            <ExcalidrawWrapper boardId={activeBoard.id} accessToken={accessToken} />
          </React.Suspense>
        ) : (
          <div className="empty-state" style={{ height: '100%', justifyContent: 'center' }}>
            <div className="empty-state-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
            </div>
            <div className="empty-state-title">No whiteboard selected</div>
            <div className="empty-state-desc">Create a new whiteboard to start drawing</div>
            <button onClick={createBoard} className="btn-primary" style={{ marginTop: 8 }}>New Whiteboard</button>
          </div>
        )}
      </div>
    </div>
  )
}
