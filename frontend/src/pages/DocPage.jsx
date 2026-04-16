import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import Placeholder from '@tiptap/extension-placeholder'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'

function CollabEditor({ docId, user, accessToken }) {
  const [ready, setReady] = useState(false)
  const ydocRef = useRef(null)
  const providerRef = useRef(null)

  useEffect(() => {
    setReady(false)
    const ydoc = new Y.Doc()
    ydocRef.current = ydoc
    const wsBase = import.meta.env.VITE_WS_URL || `ws://${location.host}`
    const provider = new WebsocketProvider(
      `${wsBase}/ws/collab`, `doc:${docId}`, ydoc,
      { params: { token: accessToken } }
    )
    providerRef.current = provider
    provider.awareness.setLocalStateField('user', { name: user.username, color: user.avatarColor })
    provider.on('sync', () => setReady(true))
    return () => { provider.destroy(); ydoc.destroy() }
  }, [docId, accessToken])

  if (!ready || !ydocRef.current || !providerRef.current) {
    return <div style={{ color: 'var(--text-muted)', padding: 16 }}>Connecting…</div>
  }

  return <EditorInner ydoc={ydocRef.current} provider={providerRef.current} user={user} />
}

function EditorInner({ ydoc, provider, user }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({ provider, user: { name: user.username, color: user.avatarColor } }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    editorProps: {
      attributes: { style: 'min-height: 400px; outline: none; padding: 0; line-height: 1.7;' },
    },
  })

  return (
    <div>
      <style>{`
        .tiptap .collaboration-cursor__caret { border-left: 2px solid; margin-left: -1px; margin-right: -1px; pointer-events: none; position: relative; word-break: normal; }
        .tiptap .collaboration-cursor__label { border-radius: 3px 3px 3px 0; color: #fff; font-size: 12px; font-style: normal; font-weight: 600; left: -1px; line-height: normal; padding: 0.1rem 0.3rem; position: absolute; top: -1.4em; user-select: none; white-space: nowrap; }
        .tiptap p { margin: 0.5em 0; }
        .tiptap h1,h2,h3 { margin: 1em 0 0.5em; }
      `}</style>
      <EditorContent editor={editor} />
    </div>
  )
}

export default function DocPage() {
  const { docId } = useParams()
  const navigate = useNavigate()
  const { currentWorkspace, user, accessToken } = useAuthStore()
  const [docs, setDocs] = useState([])
  const [activeDoc, setActiveDoc] = useState(null)
  const wid = currentWorkspace?.id

  useEffect(() => {
    if (!wid) return
    api.get(`/api/workspaces/${wid}/docs`).then(r => {
      setDocs(r.data)
      if (docId) setActiveDoc(r.data.find(d => d.id === docId) || null)
    })
  }, [wid, docId])

  async function createDoc() {
    const { data } = await api.post(`/api/workspaces/${wid}/docs`, { title: 'Untitled' })
    setDocs(d => [data, ...d])
    navigate(`/docs/${data.id}`)
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Doc list sidebar */}
      <div style={{ width: 220, borderRight: '1px solid var(--border)', padding: 16, overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontWeight: 600 }}>Docs</span>
          <button onClick={createDoc} className="btn-ghost" style={{ padding: '4px 8px', fontSize: 13 }}>+</button>
        </div>
        {docs.map(d => (
          <div key={d.id}
            onClick={() => navigate(`/docs/${d.id}`)}
            style={{
              padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
              background: activeDoc?.id === d.id ? 'rgba(99,102,241,0.1)' : 'transparent',
              color: activeDoc?.id === d.id ? 'var(--primary)' : 'var(--text)',
              marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
            📄 {d.title || 'Untitled'}
          </div>
        ))}
      </div>

      {/* Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeDoc ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
            <input
              value={activeDoc.title}
              onChange={e => {
                setActiveDoc(d => ({ ...d, title: e.target.value }))
                setDocs(ds => ds.map(d => d.id === activeDoc.id ? { ...d, title: e.target.value } : d))
              }}
              onBlur={() => api.patch(`/api/workspaces/${wid}/docs/${activeDoc.id}`, { title: activeDoc.title })}
              style={{ fontSize: 28, fontWeight: 700, background: 'transparent', border: 'none', padding: '0 0 24px 0', width: '100%', color: 'var(--text)' }}
              placeholder="Document title"
            />
            <CollabEditor key={activeDoc.id} docId={activeDoc.id} user={user} accessToken={accessToken} />
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
              <p>Select a document or create a new one</p>
              <button onClick={createDoc} className="btn-primary" style={{ marginTop: 16 }}>New Document</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
