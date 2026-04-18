import React, { useEffect, useState } from 'react'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'

export default function TodoPage() {
  const { currentWorkspace, accessToken } = useAuthStore()
  const [lists, setLists] = useState([])
  const [items, setItems] = useState([])
  const [newListTitle, setNewListTitle] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newItemText, setNewItemText] = useState({})
  const wid = currentWorkspace?.id

  useEffect(() => {
    if (!wid) return
    api.get(`/api/workspaces/${wid}/todos`).then(r => {
      setLists(r.data.lists)
      setItems(r.data.items)
    })
  }, [wid])

  useEffect(() => {
    if (!wid || !accessToken) return
    const wsProto = location.protocol === 'https:' ? 'wss' : 'ws'
    const wsUrl = (import.meta.env.VITE_WS_URL || `${wsProto}://${location.host}`) + `/ws/workspace/${wid}?token=${accessToken}`
    const ws = new WebSocket(wsUrl)
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'todo_list:created') setLists(l => [...l, data.list])
      if (data.type === 'todo_list:deleted') setLists(l => l.filter(x => x.id !== data.listId))
      if (data.type === 'todo_item:created') setItems(i => [...i, data.item])
      if (data.type === 'todo_item:updated') setItems(i => i.map(x => x.id === data.item.id ? data.item : x))
      if (data.type === 'todo_item:deleted') setItems(i => i.filter(x => x.id !== data.itemId))
    }
    return () => ws.close()
  }, [wid, accessToken])

  async function createList() {
    if (!newListTitle.trim()) return
    await api.post(`/api/workspaces/${wid}/todos/lists`, { title: newListTitle.trim() })
    setNewListTitle('')
    setShowNew(false)
  }

  async function addItem(listId) {
    const text = newItemText[listId]?.trim()
    if (!text) return
    await api.post(`/api/workspaces/${wid}/todos/lists/${listId}/items`, { text })
    setNewItemText(t => ({ ...t, [listId]: '' }))
  }

  async function toggleItem(item) {
    await api.patch(`/api/workspaces/${wid}/todos/items/${item.id}`, { completed: !item.completed })
  }

  async function deleteItem(id) {
    await api.delete(`/api/workspaces/${wid}/todos/items/${id}`)
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
        <h2 className="page-title">To-Do Lists</h2>
        <div style={{ flex: 1 }} />
        {showNew ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <input autoFocus value={newListTitle} onChange={e => setNewListTitle(e.target.value)}
              placeholder="List name…" style={{ width: 180 }}
              onKeyDown={e => { if (e.key === 'Enter') createList(); if (e.key === 'Escape') setShowNew(false) }} />
            <button onClick={createList} className="btn-primary" style={{ padding: '6px 12px' }}>Create</button>
            <button onClick={() => setShowNew(false)} className="btn-ghost" style={{ padding: '6px 10px' }}>×</button>
          </div>
        ) : (
          <button onClick={() => setShowNew(true)} className="btn-primary" style={{ fontSize: 12 }}>+ New List</button>
        )}
      </div>

      {lists.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-state-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
          </div>
          <div className="empty-state-title">No lists yet</div>
          <div className="empty-state-desc">Create a shared to-do list for your team</div>
          <button onClick={() => setShowNew(true)} className="btn-primary" style={{ marginTop: 8 }}>Create List</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16 }}>
          {lists.map(list => {
            const listItems = items.filter(i => i.list_id === list.id).sort((a, b) => a.position - b.position)
            const completed = listItems.filter(i => i.completed).length
            const pct = listItems.length > 0 ? Math.round((completed / listItems.length) * 100) : 0

            return (
              <div key={list.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {/* List header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{list.title}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{completed}/{listItems.length}</span>
                    <button
                      onClick={() => api.delete(`/api/workspaces/${wid}/todos/lists/${list.id}`)}
                      className="btn-icon"
                      style={{ padding: '3px' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18 M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                {listItems.length > 0 && (
                  <div style={{ height: 3, background: 'var(--bg-4)', borderRadius: 2, overflow: 'hidden', marginBottom: 12 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--success)', borderRadius: 2, transition: 'width 0.4s ease' }} />
                  </div>
                )}

                {/* Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 10 }}>
                  {listItems.map(item => (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '6px 4px', borderRadius: 6,
                      transition: 'background var(--t-fast)',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Checkbox */}
                      <div
                        onClick={() => toggleItem(item)}
                        style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0, cursor: 'pointer',
                          background: item.completed ? 'var(--success)' : 'transparent',
                          border: item.completed ? '1px solid var(--success)' : '1px solid var(--border-hover)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all var(--t)',
                        }}
                      >
                        {item.completed && (
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                        )}
                      </div>
                      <span style={{
                        flex: 1, fontSize: 13,
                        color: item.completed ? 'var(--text-muted)' : 'var(--text)',
                        textDecoration: item.completed ? 'line-through' : 'none',
                        transition: 'all var(--t)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {item.text}
                      </span>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="btn-icon"
                        style={{ padding: '2px', opacity: 0, transition: 'opacity var(--t-fast)' }}
                        onFocus={e => e.currentTarget.style.opacity = '1'}
                        onBlur={e => e.currentTarget.style.opacity = '0'}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18 M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add item */}
                <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <input
                    value={newItemText[list.id] || ''}
                    onChange={e => setNewItemText(t => ({ ...t, [list.id]: e.target.value }))}
                    placeholder="Add item…"
                    onKeyDown={e => e.key === 'Enter' && addItem(list.id)}
                    style={{ flex: 1, fontSize: 12, padding: '6px 9px' }}
                  />
                  <button onClick={() => addItem(list.id)} className="btn-ghost" style={{ padding: '5px 10px', fontSize: 16 }}>+</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
