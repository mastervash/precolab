import React, { useEffect, useState } from 'react'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'

export default function TodoPage() {
  const { currentWorkspace, accessToken } = useAuthStore()
  const [lists, setLists] = useState([])
  const [items, setItems] = useState([])
  const [newListTitle, setNewListTitle] = useState('')
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
    const wsUrl = (import.meta.env.VITE_WS_URL || `ws://${location.host}`) + `/ws/workspace/${wid}?token=${accessToken}`
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
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, fontSize: 18 }}>To-Do Lists</h2>
        <input value={newListTitle} onChange={e => setNewListTitle(e.target.value)}
          placeholder="New list name…" style={{ width: 200 }}
          onKeyDown={e => e.key === 'Enter' && createList()} />
        <button onClick={createList} className="btn-ghost">+ List</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {lists.map(list => (
          <div key={list.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontWeight: 600 }}>{list.title}</h3>
              <button onClick={() => api.delete(`/api/workspaces/${wid}/todos/lists/${list.id}`)}
                style={{ background: 'none', color: 'var(--text-muted)', fontSize: 16, padding: '0 4px' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {items.filter(i => i.list_id === list.id).sort((a, b) => a.position - b.position).map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={item.completed}
                    onChange={() => toggleItem(item)}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--primary)' }} />
                  <span style={{ flex: 1, textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? 'var(--text-muted)' : 'var(--text)' }}>
                    {item.text}
                  </span>
                  <button onClick={() => deleteItem(item.id)}
                    style={{ background: 'none', color: 'var(--text-muted)', fontSize: 14, padding: '0 2px' }}>×</button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <input value={newItemText[list.id] || ''}
                onChange={e => setNewItemText(t => ({ ...t, [list.id]: e.target.value }))}
                placeholder="Add item…"
                onKeyDown={e => e.key === 'Enter' && addItem(list.id)}
                style={{ flex: 1 }} />
              <button onClick={() => addItem(list.id)} className="btn-ghost" style={{ padding: '6px 10px' }}>+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
