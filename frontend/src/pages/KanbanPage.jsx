import React, { useEffect, useState } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'
import CommentThread from '../components/ui/CommentThread.jsx'

const Icon = ({ d, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const COLUMN_COLORS = ['#7c6ffd', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6']

export default function KanbanPage() {
  const { currentWorkspace, accessToken } = useAuthStore()
  const [boards, setBoards] = useState([])
  const [activeBoard, setActiveBoard] = useState(null)
  const [columns, setColumns] = useState([])
  const [cards, setCards] = useState([])
  const [newBoardTitle, setNewBoardTitle] = useState('')
  const [showNewBoard, setShowNewBoard] = useState(false)
  const [newCardText, setNewCardText] = useState({})
  const [selectedCard, setSelectedCard] = useState(null)

  const wid = currentWorkspace?.id

  useEffect(() => {
    if (!wid) return
    api.get(`/api/workspaces/${wid}/kanban/boards`).then(r => {
      setBoards(r.data)
      if (r.data.length > 0) loadBoard(r.data[0].id)
    })
  }, [wid])

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
    setShowNewBoard(false)
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
    setCards(prev => prev.map(c => c.id === draggableId
      ? { ...c, column_id: destination.droppableId, position: destination.index }
      : c))
    await api.patch(`/api/workspaces/${wid}/kanban/boards/${activeBoard}/cards/${draggableId}`, {
      column_id: destination.droppableId,
      position: destination.index,
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top bar */}
      <div className="panel-topbar" style={{ gap: 10, padding: '10px 20px' }}>
        <Icon d="M3 3h6v18H3z M9 3h6v10H9z M15 3h6v14h-6z" size={15} />
        <span className="panel-topbar-title">Kanban</span>
        <div style={{ display: 'flex', gap: 6, marginLeft: 4, flex: 1, overflowX: 'auto' }}>
          {boards.map((b, i) => (
            <button
              key={b.id}
              onClick={() => loadBoard(b.id)}
              style={{
                padding: '4px 12px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: b.id === activeBoard ? 600 : 400,
                background: b.id === activeBoard ? 'var(--primary-dim)' : 'var(--bg-3)',
                color: b.id === activeBoard ? 'var(--primary)' : 'var(--text-muted)',
                border: b.id === activeBoard ? '1px solid rgba(124,111,253,0.25)' : '1px solid var(--border)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all var(--t-fast)',
              }}
            >
              {b.title}
            </button>
          ))}
        </div>
        {showNewBoard ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              autoFocus
              value={newBoardTitle}
              onChange={e => setNewBoardTitle(e.target.value)}
              placeholder="Board name…"
              style={{ width: 160 }}
              onKeyDown={e => { if (e.key === 'Enter') createBoard(); if (e.key === 'Escape') setShowNewBoard(false) }}
            />
            <button onClick={createBoard} className="btn-primary" style={{ padding: '6px 12px' }}>Add</button>
            <button onClick={() => setShowNewBoard(false)} className="btn-ghost" style={{ padding: '6px 10px' }}>×</button>
          </div>
        ) : (
          <button onClick={() => setShowNewBoard(true)} className="btn-ghost" style={{ padding: '5px 12px', fontSize: 12 }}>
            + Board
          </button>
        )}
      </div>

      {/* Board content */}
      {activeBoard ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '20px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            {columns.map((col, colIdx) => {
              const colColor = COLUMN_COLORS[colIdx % COLUMN_COLORS.length]
              const colCards = cards.filter(c => c.column_id === col.id).sort((a, b) => a.position - b.position)
              return (
                <Droppable key={col.id} droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        width: 270,
                        flexShrink: 0,
                        background: snapshot.isDraggingOver ? `${colColor}08` : 'var(--bg-2)',
                        border: `1px solid ${snapshot.isDraggingOver ? colColor + '30' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-lg)',
                        display: 'flex',
                        flexDirection: 'column',
                        maxHeight: 'calc(100vh - 130px)',
                        transition: 'border-color var(--t), background var(--t)',
                      }}
                    >
                      {/* Column header */}
                      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: colColor, flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', flex: 1 }}>{col.title}</span>
                          <span style={{
                            fontSize: 11, fontWeight: 600,
                            background: 'var(--bg-3)', color: 'var(--text-muted)',
                            borderRadius: 999, padding: '1px 7px',
                            border: '1px solid var(--border)',
                          }}>
                            {colCards.length}
                          </span>
                        </div>
                      </div>

                      {/* Cards */}
                      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
                        {colCards.map((card, index) => (
                          <Draggable key={card.id} draggableId={card.id} index={index}>
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                onClick={() => !snap.isDragging && setSelectedCard(card)}
                                style={{
                                  ...prov.draggableProps.style,
                                  background: snap.isDragging ? 'var(--bg-4)' : 'var(--bg-3)',
                                  border: `1px solid ${snap.isDragging ? 'var(--border-hover)' : 'var(--border)'}`,
                                  borderRadius: 'var(--radius)',
                                  padding: '10px 12px',
                                  marginBottom: 6,
                                  cursor: snap.isDragging ? 'grabbing' : 'pointer',
                                  boxShadow: snap.isDragging ? 'var(--shadow-lg)' : 'none',
                                  transition: snap.isDragging ? 'none' : 'all var(--t-fast)',
                                }}
                              >
                                <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>{card.title}</div>
                                {card.labels?.length > 0 && (
                                  <div style={{ display: 'flex', gap: 4, marginTop: 7, flexWrap: 'wrap' }}>
                                    {card.labels.map(l => (
                                      <span key={l} style={{
                                        background: 'var(--primary-dim)', color: 'var(--primary)',
                                        borderRadius: 4, padding: '1px 6px', fontSize: 10,
                                        border: '1px solid rgba(124,111,253,0.2)', fontWeight: 500,
                                      }}>{l}</span>
                                    ))}
                                  </div>
                                )}
                                {(card.assignee_username || card.due_date) && (
                                  <div style={{ display: 'flex', gap: 8, marginTop: 7, alignItems: 'center' }}>
                                    {card.assignee_username && (
                                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        @{card.assignee_username}
                                      </span>
                                    )}
                                    {card.due_date && (
                                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                        {new Date(card.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>

                      {/* Add card */}
                      <div style={{ padding: '6px 8px 10px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <input
                            value={newCardText[col.id] || ''}
                            onChange={e => setNewCardText(t => ({ ...t, [col.id]: e.target.value }))}
                            placeholder="Add a card…"
                            onKeyDown={e => e.key === 'Enter' && addCard(col.id)}
                            style={{ flex: 1, fontSize: 12, padding: '6px 9px' }}
                          />
                          <button
                            onClick={() => addCard(col.id)}
                            style={{ padding: '6px 10px', background: colColor + '20', color: colColor, border: `1px solid ${colColor}30`, borderRadius: 6, fontSize: 16, fontWeight: 400, cursor: 'pointer', transition: 'all var(--t-fast)' }}
                            onMouseEnter={e => e.currentTarget.style.background = colColor + '35'}
                            onMouseLeave={e => e.currentTarget.style.background = colColor + '20'}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </Droppable>
              )
            })}
          </div>
        </DragDropContext>
      ) : (
        <div className="empty-state" style={{ flex: 1 }}>
          <div className="empty-state-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 3h6v18H3z M9 3h6v10H9z M15 3h6v14h-6z" /></svg>
          </div>
          <div className="empty-state-title">No boards yet</div>
          <div className="empty-state-desc">Create your first board to get started organizing work</div>
          <button onClick={() => setShowNewBoard(true)} className="btn-primary" style={{ marginTop: 8 }}>Create Board</button>
        </div>
      )}

      {/* Card detail modal */}
      {selectedCard && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={e => e.target === e.currentTarget && setSelectedCard(null)}
        >
          <div style={{
            background: 'var(--bg-2)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-hover)',
            width: '100%', maxWidth: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', lineHeight: 1.4, flex: 1 }}>
                  {selectedCard.title}
                </h3>
                <button onClick={() => setSelectedCard(null)} className="btn-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18 M6 6l12 12" /></svg>
                </button>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                {selectedCard.assignee_username && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--text-subtle)' }}>Assignee </span>@{selectedCard.assignee_username}
                  </span>
                )}
                {selectedCard.due_date && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--text-subtle)' }}>Due </span>
                    {new Date(selectedCard.due_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
                {selectedCard.labels?.length > 0 && selectedCard.labels.map(l => (
                  <span key={l} style={{ background: 'var(--primary-dim)', color: 'var(--primary)', borderRadius: 4, padding: '1px 6px', fontSize: 10, border: '1px solid rgba(124,111,253,0.2)', fontWeight: 500 }}>{l}</span>
                ))}
              </div>
            </div>

            {/* Description + Comments */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
              {selectedCard.description && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Description</div>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{selectedCard.description}</p>
                </div>
              )}
              <CommentThread entityType="card" entityId={selectedCard.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
