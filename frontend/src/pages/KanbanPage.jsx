import React, { useEffect, useState, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'

export default function KanbanPage() {
  const { currentWorkspace, accessToken } = useAuthStore()
  const [boards, setBoards] = useState([])
  const [activeBoard, setActiveBoard] = useState(null)
  const [columns, setColumns] = useState([])
  const [cards, setCards] = useState([])
  const [newBoardTitle, setNewBoardTitle] = useState('')
  const [newCardText, setNewCardText] = useState({})

  const wid = currentWorkspace?.id

  useEffect(() => {
    if (!wid) return
    api.get(`/api/workspaces/${wid}/kanban/boards`).then(r => {
      setBoards(r.data)
      if (r.data.length > 0) loadBoard(r.data[0].id)
    })
  }, [wid])

  // WS for real-time updates
  useEffect(() => {
    if (!wid || !accessToken) return
    const wsUrl = (import.meta.env.VITE_WS_URL || `ws://${location.host}`) + `/ws/workspace/${wid}?token=${accessToken}`
    const ws = new WebSocket(wsUrl)
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'board:created') setBoards(b => [...b, data.board])
      if (data.type === 'card:created') setCards(c => [...c, data.card])
      if (data.type === 'card:updated') setCards(c => c.map(x => x.id === data.card.id ? data.card : x))
      if (data.type === 'card:deleted') setCards(c => c.filter(x => x.id !== data.cardId))
      if (data.type === 'column:created') setColumns(c => [...c, data.column])
    }
    return () => ws.close()
  }, [wid, accessToken])

  async function loadBoard(boardId) {
    setActiveBoard(boardId)
    const r = await api.get(`/api/workspaces/${wid}/kanban/boards/${boardId}`)
    setColumns(r.data.columns)
    setCards(r.data.cards)
  }

  async function createBoard() {
    if (!newBoardTitle.trim()) return
    await api.post(`/api/workspaces/${wid}/kanban/boards`, { title: newBoardTitle.trim() })
    setNewBoardTitle('')
  }

  async function addCard(columnId) {
    const text = newCardText[columnId]?.trim()
    if (!text) return
    await api.post(`/api/workspaces/${wid}/kanban/boards/${activeBoard}/cards`, { title: text, columnId })
    setNewCardText(t => ({ ...t, [columnId]: '' }))
  }

  async function onDragEnd(result) {
    if (!result.destination) return
    const { draggableId, source, destination } = result
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    // Optimistic update
    setCards(prev => {
      const updated = prev.map(c => c.id === draggableId
        ? { ...c, column_id: destination.droppableId, position: destination.index }
        : c)
      return updated
    })

    await api.patch(`/api/workspaces/${wid}/kanban/boards/${activeBoard}/cards/${draggableId}`, {
      column_id: destination.droppableId,
      position: destination.index,
    })
  }

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h2 style={{ fontWeight: 700, fontSize: 18 }}>Kanban</h2>
        {boards.map(b => (
          <button key={b.id} onClick={() => loadBoard(b.id)}
            className={b.id === activeBoard ? 'btn-primary' : 'btn-ghost'}
            style={{ padding: '4px 12px' }}>
            {b.title}
          </button>
        ))}
        <input value={newBoardTitle} onChange={e => setNewBoardTitle(e.target.value)}
          placeholder="New board…" style={{ width: 160 }}
          onKeyDown={e => e.key === 'Enter' && createBoard()} />
        <button onClick={createBoard} className="btn-ghost">+ Board</button>
      </div>

      {activeBoard && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 16 }}>
            {columns.map(col => (
              <Droppable key={col.id} droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      width: 280, flexShrink: 0,
                      background: snapshot.isDraggingOver ? 'rgba(99,102,241,0.05)' : 'var(--bg-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 12,
                    }}
                  >
                    <h3 style={{ fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {col.title} · {cards.filter(c => c.column_id === col.id).length}
                    </h3>

                    {cards
                      .filter(c => c.column_id === col.id)
                      .sort((a, b) => a.position - b.position)
                      .map((card, index) => (
                        <Draggable key={card.id} draggableId={card.id} index={index}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              style={{
                                ...prov.draggableProps.style,
                                background: snap.isDragging ? 'var(--bg-3)' : 'var(--bg-3)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)',
                                padding: 10,
                                marginBottom: 8,
                                cursor: 'grab',
                              }}
                            >
                              <div style={{ fontWeight: 500 }}>{card.title}</div>
                              {card.labels?.length > 0 && (
                                <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                                  {card.labels.map(l => (
                                    <span key={l} style={{ background: 'var(--primary)', color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: 11 }}>{l}</span>
                                  ))}
                                </div>
                              )}
                              {card.assignee_username && (
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>@{card.assignee_username}</div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}

                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <input
                        value={newCardText[col.id] || ''}
                        onChange={e => setNewCardText(t => ({ ...t, [col.id]: e.target.value }))}
                        placeholder="Add card…"
                        onKeyDown={e => e.key === 'Enter' && addCard(col.id)}
                        style={{ flex: 1 }}
                      />
                      <button onClick={() => addCard(col.id)} className="btn-ghost" style={{ padding: '6px 10px' }}>+</button>
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}
    </div>
  )
}
