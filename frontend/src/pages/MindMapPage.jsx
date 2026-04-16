import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ReactFlow, addEdge, useNodesState, useEdgesState,
  Controls, MiniMap, Background, Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'

export default function MindMapPage() {
  const { mapId } = useParams()
  const navigate = useNavigate()
  const { currentWorkspace, accessToken } = useAuthStore()
  const [maps, setMaps] = useState([])
  const [activeMap, setActiveMap] = useState(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const ydocRef = useRef(null)
  const providerRef = useRef(null)
  const wid = currentWorkspace?.id

  useEffect(() => {
    if (!wid) return
    api.get(`/api/workspaces/${wid}/mindmaps`).then(r => {
      setMaps(r.data)
      const target = mapId ? r.data.find(m => m.id === mapId) : null
      if (target) openMap(target)
    })
  }, [wid, mapId])

  function openMap(map) {
    setActiveMap(map)
    navigate(`/mindmap/${map.id}`)

    providerRef.current?.destroy()
    ydocRef.current?.destroy()

    const ydoc = new Y.Doc()
    ydocRef.current = ydoc

    const wsBase = import.meta.env.VITE_WS_URL || `ws://${location.host}`
    const provider = new WebsocketProvider(
      `${wsBase}/ws/collab`, `mindmap:${map.id}`, ydoc,
      { params: { token: accessToken } }
    )
    providerRef.current = provider

    const yNodes = ydoc.getArray('nodes')
    const yEdges = ydoc.getArray('edges')

    provider.on('sync', (isSynced) => {
      if (isSynced && yNodes.length === 0) {
        ydoc.transact(() => {
          yNodes.push([{ id: '1', type: 'default', position: { x: 300, y: 200 }, data: { label: map.title } }])
        })
      }
      setNodes(yNodes.toArray())
      setEdges(yEdges.toArray())
    })

    yNodes.observe(() => setNodes(yNodes.toArray()))
    yEdges.observe(() => setEdges(yEdges.toArray()))
  }

  const onConnect = useCallback((connection) => {
    if (!ydocRef.current) return
    const yEdges = ydocRef.current.getArray('edges')
    const newEdge = { ...connection, id: `e-${Date.now()}` }
    ydocRef.current.transact(() => yEdges.push([newEdge]))
  }, [])

  function addNode() {
    if (!ydocRef.current) return
    const yNodes = ydocRef.current.getArray('nodes')
    const newNode = {
      id: `n-${Date.now()}`,
      type: 'default',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: { label: 'New idea' },
    }
    ydocRef.current.transact(() => yNodes.push([newNode]))
  }

  async function createMap() {
    const { data } = await api.post(`/api/workspaces/${wid}/mindmaps`, { title: 'New Mind Map' })
    setMaps(m => [data, ...m])
    openMap(data)
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round"><path d="M6 3v12 M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M15 6a9 9 0 0 1-9 9" /></svg>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>Mind Maps</span>
          </div>
          <button onClick={createMap} className="btn-icon" title="New mind map" style={{ color: 'var(--primary)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14 M5 12h14" /></svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {maps.length === 0 && (
            <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: 12 }}>
              No mind maps yet
            </div>
          )}
          {maps.map(m => (
            <button key={m.id}
              onClick={() => openMap(m)}
              style={{
                width: '100%', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 'var(--radius)',
                border: 'none', cursor: 'pointer', marginBottom: 1,
                background: activeMap?.id === m.id ? 'var(--primary-dim)' : 'transparent',
                color: activeMap?.id === m.id ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: 13, fontWeight: activeMap?.id === m.id ? 500 : 400,
                transition: 'all var(--t-fast)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                boxShadow: activeMap?.id === m.id ? 'inset 0 0 0 1px rgba(124,111,253,0.15)' : 'none',
              }}
              onMouseEnter={e => { if (activeMap?.id !== m.id) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (activeMap?.id !== m.id) e.currentTarget.style.background = 'transparent' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M6 3v12 M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M15 6a9 9 0 0 1-9 9" /></svg>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Flow canvas */}
      <div style={{ flex: 1, height: '100%' }}>
        {activeMap ? (
          <>
            <style>{`
              .react-flow__node { font-family: inherit; font-size: 13px; }
              .react-flow__node-default {
                background: var(--bg-3) !important;
                border: 1px solid var(--border-hover) !important;
                color: var(--text) !important;
                border-radius: 8px !important;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
              }
              .react-flow__node-default.selected { border-color: var(--primary) !important; box-shadow: 0 0 0 2px var(--primary-dim) !important; }
              .react-flow__edge-path { stroke: var(--border-hover) !important; }
              .react-flow__controls { background: var(--bg-2) !important; border: 1px solid var(--border) !important; border-radius: var(--radius-lg) !important; }
              .react-flow__controls-button { background: var(--bg-2) !important; border-color: var(--border) !important; color: var(--text-muted) !important; fill: var(--text-muted) !important; }
              .react-flow__controls-button:hover { background: var(--bg-3) !important; }
              .react-flow__minimap { background: var(--bg-2) !important; border: 1px solid var(--border) !important; border-radius: var(--radius-lg) !important; }
              .react-flow__minimap-mask { fill: var(--bg) !important; }
            `}</style>
            <ReactFlow
              nodes={nodes} edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              style={{ background: 'var(--bg)' }}
              fitView
            >
              <Controls />
              <MiniMap style={{ background: 'var(--bg-2)' }} nodeColor="var(--primary)" />
              <Background color="var(--border)" gap={20} />
              <Panel position="top-right" style={{ margin: 12 }}>
                <button onClick={addNode} className="btn-primary" style={{ fontSize: 12, padding: '7px 14px', boxShadow: 'var(--shadow-primary)' }}>
                  + Add Node
                </button>
              </Panel>
            </ReactFlow>
          </>
        ) : (
          <div className="empty-state" style={{ height: '100%', justifyContent: 'center' }}>
            <div className="empty-state-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 3v12 M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M15 6a9 9 0 0 1-9 9" /></svg>
            </div>
            <div className="empty-state-title">No mind map selected</div>
            <div className="empty-state-desc">Create a new mind map to start brainstorming</div>
            <button onClick={createMap} className="btn-primary" style={{ marginTop: 8 }}>New Mind Map</button>
          </div>
        )}
      </div>
    </div>
  )
}
