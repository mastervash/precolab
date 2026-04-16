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

    // Clean up previous
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

    // Initialize with default root node if empty
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
      <div style={{ width: 200, borderRight: '1px solid var(--border)', padding: 12, overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 600 }}>Mind Maps</span>
          <button onClick={createMap} className="btn-ghost" style={{ padding: '4px 8px' }}>+</button>
        </div>
        {maps.map(m => (
          <div key={m.id}
            onClick={() => openMap(m)}
            style={{
              padding: '6px 8px', borderRadius: 6, cursor: 'pointer', marginBottom: 2,
              background: activeMap?.id === m.id ? 'rgba(99,102,241,0.1)' : 'transparent',
              color: activeMap?.id === m.id ? 'var(--primary)' : 'var(--text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
            🧠 {m.title}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, height: '100%' }}>
        {activeMap ? (
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            style={{ background: 'var(--bg)' }}
            fitView
          >
            <Controls />
            <MiniMap style={{ background: 'var(--bg-2)' }} />
            <Background color="var(--border)" gap={16} />
            <Panel position="top-right">
              <button onClick={addNode} className="btn-primary" style={{ padding: '6px 14px' }}>+ Node</button>
            </Panel>
          </ReactFlow>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
              <p>Select a mind map or create one</p>
              <button onClick={createMap} className="btn-primary" style={{ marginTop: 16 }}>New Mind Map</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
