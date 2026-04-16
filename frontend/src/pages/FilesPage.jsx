import React, { useEffect, useState, useRef } from 'react'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FilesPage() {
  const { currentWorkspace } = useAuthStore()
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const wid = currentWorkspace?.id
  const apiBase = import.meta.env.VITE_API_URL || ''

  useEffect(() => {
    if (!wid) return
    api.get(`/api/workspaces/${wid}/files/docs`).then(r => setFiles(r.data))
  }, [wid])

  async function handleUpload(e) {
    const fs = e.target.files
    if (!fs.length) return
    setUploading(true)
    const form = new FormData()
    Array.from(fs).forEach(f => form.append('files', f))
    try {
      const { data } = await api.post(`/api/workspaces/${wid}/files/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setFiles(f => [...data, ...f])
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function deleteFile(id) {
    if (!confirm('Delete this file?')) return
    await api.delete(`/api/workspaces/${wid}/files/${id}`)
    setFiles(f => f.filter(x => x.id !== id))
  }

  const ICONS = {
    'application/pdf': '📑',
    'text/plain': '📝',
    'text/csv': '📊',
    'application/zip': '🗜',
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, fontSize: 18 }}>Files</h2>
        <button onClick={() => fileRef.current.click()} className="btn-primary" disabled={uploading}>
          {uploading ? 'Uploading…' : '+ Upload'}
        </button>
        <input ref={fileRef} type="file" multiple onChange={handleUpload} style={{ display: 'none' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {files.length === 0 && (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 48 }}>No files yet. Upload something!</div>
        )}
        {files.map(file => (
          <div key={file.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
            <span style={{ fontSize: 24 }}>{ICONS[file.mime_type] || '📁'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.original_name}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {formatSize(file.size_bytes)} · {file.username} · {new Date(file.created_at).toLocaleDateString()}
              </div>
            </div>
            <a
              href={`${apiBase}/api/workspaces/${wid}/files/serve/${file.filename}`}
              download={file.original_name}
              className="btn-ghost"
              style={{ padding: '6px 12px', fontSize: 13 }}
            >
              Download
            </a>
            <button onClick={() => deleteFile(file.id)} className="btn-ghost" style={{ padding: '6px 10px', color: 'var(--danger)' }}>
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
