import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'

// Lazy load Excalidraw to avoid SSR issues
const ExcalidrawWrapper = React.lazy(() =>
  import('@excalidraw/excalidraw').then(mod => ({
    default: function ExcalidrawWrapped({ boardId, accessToken }) {
      const { Excalidraw } = mod
      const [elements, setElements] = React.useState([])
      const [wsReady, setWsReady] = React.useState(false)
      const wsRef = React.useRef(null)

      React.useEffect(() => {
        const wsBase = import.meta.env.VITE_WS_URL || `ws://${location.host}`
        const ws = new WebSocket(`${wsBase}/ws/collab/whiteboard:${boardId}?token=${accessToken}`)
        ws.binaryType = 'arraybuffer'
        ws.onopen = () => setWsReady(true)
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
      <div style={{ width: 200, borderRight: '1px solid var(--border)', padding: 12, overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 600 }}>Whiteboards</span>
          <button onClick={createBoard} className="btn-ghost" style={{ padding: '4px 8px' }}>+</button>
        </div>
        {boards.map(b => (
          <div key={b.id}
            onClick={() => { setActiveBoard(b); navigate(`/whiteboard/${b.id}`) }}
            style={{
              padding: '6px 8px', borderRadius: 6, cursor: 'pointer', marginBottom: 2,
              background: activeBoard?.id === b.id ? 'rgba(99,102,241,0.1)' : 'transparent',
              color: activeBoard?.id === b.id ? 'var(--primary)' : 'var(--text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
            ✏️ {b.title}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeBoard ? (
          <React.Suspense fallback={<div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading whiteboard…</div>}>
            <ExcalidrawWrapper boardId={activeBoard.id} accessToken={accessToken} />
          </React.Suspense>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', height: '100%' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✏️</div>
              <p>Select a whiteboard or create a new one</p>
              <button onClick={createBoard} className="btn-primary" style={{ marginTop: 16 }}>New Whiteboard</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
