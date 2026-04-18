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
    const wsBase = import.meta.env.VITE_WS_URL || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`
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
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-subtle)', animation: 'pulse 1.5s ease infinite' }} />
        Connecting…
      </div>
    )
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
      attributes: { style: 'min-height: 400px; outline: none; padding: 0; line-height: 1.8;' },
    },
  })

  return (
    <div>
      <style>{`
        .tiptap .collaboration-cursor__caret { border-left: 2px solid; margin-left: -1px; margin-right: -1px; pointer-events: none; position: relative; word-break: normal; }
        .tiptap .collaboration-cursor__label { border-radius: 3px 3px 3px 0; color: #fff; font-size: 11px; font-weight: 600; left: -1px; line-height: normal; padding: 0.1rem 0.3rem; position: absolute; top: -1.4em; user-select: none; white-space: nowrap; }
        .tiptap p { margin: 0.4em 0; color: var(--text); }
        .tiptap h1 { font-size: 22px; font-weight: 700; margin: 1.2em 0 0.4em; color: var(--text); }
        .tiptap h2 { font-size: 18px; font-weight: 600; margin: 1em 0 0.4em; color: var(--text); }
        .tiptap h3 { font-size: 15px; font-weight: 600; margin: 0.8em 0 0.3em; color: var(--text); }
        .tiptap ul, .tiptap ol { padding-left: 20px; color: var(--text); }
        .tiptap li { margin: 0.2em 0; }
        .tiptap blockquote { border-left: 3px solid var(--primary); padding-left: 14px; margin: 0.8em 0; color: var(--text-muted); font-style: italic; }
        .tiptap code { background: var(--bg-3); border-radius: 4px; padding: 0.1em 0.4em; font-size: 0.88em; color: var(--primary); }
        .tiptap pre { background: var(--bg-3); border-radius: 8px; padding: 12px 16px; overflow-x: auto; }
        .tiptap pre code { background: none; padding: 0; color: var(--text); }
        .tiptap .is-editor-empty::before { color: var(--text-subtle); pointer-events: none; float: left; height: 0; content: attr(data-placeholder); }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
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
      {/* Sidebar */}
      <div style={{
        width: 228, flexShrink: 0,
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" /></svg>
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>Docs</span>
          </div>
          <button onClick={createDoc} className="btn-icon" title="New document" style={{ color: 'var(--primary)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14 M5 12h14" /></svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {docs.length === 0 && (
            <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: 12 }}>
              No documents yet
            </div>
          )}
          {docs.map(d => (
            <button key={d.id}
              onClick={() => navigate(`/docs/${d.id}`)}
              style={{
                width: '100%', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 'var(--radius)',
                border: 'none', cursor: 'pointer', marginBottom: 1,
                background: activeDoc?.id === d.id ? 'var(--primary-dim)' : 'transparent',
                color: activeDoc?.id === d.id ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: 13, fontWeight: activeDoc?.id === d.id ? 500 : 400,
                transition: 'all var(--t-fast)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                boxShadow: activeDoc?.id === d.id ? 'inset 0 0 0 1px rgba(124,111,253,0.15)' : 'none',
              }}
              onMouseEnter={e => { if (activeDoc?.id !== d.id) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (activeDoc?.id !== d.id) e.currentTarget.style.background = 'transparent' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" /></svg>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title || 'Untitled'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
        {activeDoc ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '48px 56px', maxWidth: 820, margin: '0 auto', width: '100%' }}>
            <input
              value={activeDoc.title}
              onChange={e => {
                setActiveDoc(d => ({ ...d, title: e.target.value }))
                setDocs(ds => ds.map(d => d.id === activeDoc.id ? { ...d, title: e.target.value } : d))
              }}
              onBlur={() => api.patch(`/api/workspaces/${wid}/docs/${activeDoc.id}`, { title: activeDoc.title })}
              style={{
                fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em',
                background: 'transparent', border: 'none', padding: '0 0 28px 0',
                width: '100%', color: 'var(--text)',
                borderBottom: '1px solid var(--border)',
                marginBottom: 28,
                outline: 'none',
              }}
              placeholder="Document title"
            />
            <CollabEditor key={activeDoc.id} docId={activeDoc.id} user={user} accessToken={accessToken} />
          </div>
        ) : (
          <div className="empty-state" style={{ flex: 1, justifyContent: 'center' }}>
            <div className="empty-state-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" /></svg>
            </div>
            <div className="empty-state-title">No document selected</div>
            <div className="empty-state-desc">Choose a document from the sidebar or create a new one</div>
            <button onClick={createDoc} className="btn-primary" style={{ marginTop: 8 }}>New Document</button>
          </div>
        )}
      </div>
    </div>
  )
}
