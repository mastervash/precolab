import React, { useEffect, useState, useRef } from 'react'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'
import { toast } from '../components/ui/Toast.jsx'

const MIME_ICONS = {
  'application/pdf': { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6', color: '#f0455a' },
  'text/plain':      { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8', color: '#7c6ffd' },
  'text/csv':        { d: 'M3 3h18v18H3z M3 9h18 M3 15h18 M9 3v18 M15 3v18', color: '#10b981' },
  'application/zip': { d: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z', color: '#f59e0b' },
}
const DEFAULT_ICON = { d: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z', color: '#6b6b8a' }

function formatSize(b) {
  if (b < 1024) return `${b} B`
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 ** 2).toFixed(1)} MB`
}

export default function FilesPage() {
  const { currentWorkspace } = useAuthStore()
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const wid = currentWorkspace?.id
  const apiBase = import.meta.env.VITE_API_URL || ''

  useEffect(() => { if (wid) api.get(`/api/workspaces/${wid}/files/docs`).then(r => setFiles(r.data)) }, [wid])

  async function handleUpload(e) {
    const fs = e.target.files
    if (!fs.length) return
    setUploading(true)
    const form = new FormData()
    Array.from(fs).forEach(f => form.append('files', f))
    try {
      const { data } = await api.post(`/api/workspaces/${wid}/files/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setFiles(f => [...data, ...f])
      toast.success(`${data.length} file${data.length > 1 ? 's' : ''} uploaded`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function deleteFile(id, name) {
    if (!confirm(`Delete "${name}"?`)) return
    await api.delete(`/api/workspaces/${wid}/files/${id}`)
    setFiles(f => f.filter(x => x.id !== id))
    toast.info('File deleted')
  }

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="page-header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
        <h2 className="page-title">Files</h2>
        <div style={{ flex: 1 }} />
        <button onClick={() => fileRef.current.click()} className="btn-primary" disabled={uploading} style={{ fontSize: 12 }}>
          {uploading ? (
            <><span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} /> Uploading…</>
          ) : '+ Upload'}
        </button>
        <input ref={fileRef} type="file" multiple onChange={handleUpload} style={{ display: 'none' }} />
      </div>

      {files.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 32 }}>
          <div className="empty-state-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
          </div>
          <div className="empty-state-title">No files yet</div>
          <div className="empty-state-desc">Upload PDFs, spreadsheets, docs and more to share with your team</div>
          <button onClick={() => fileRef.current.click()} className="btn-primary" style={{ marginTop: 8 }}>Upload Files</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {files.map(file => {
            const icon = MIME_ICONS[file.mime_type] || DEFAULT_ICON
            return (
              <div key={file.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 16px',
                background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
                transition: 'border-color var(--t-fast)',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: `${icon.color}15`, border: `1px solid ${icon.color}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={icon.color} strokeWidth="1.8" strokeLinecap="round">
                    <path d={icon.d} />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.original_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {formatSize(file.size_bytes)} · {file.username} · {new Date(file.created_at).toLocaleDateString()}
                  </div>
                </div>
                <a
                  href={`${apiBase}/api/workspaces/${wid}/files/serve/${file.filename}`}
                  download={file.original_name}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 'var(--radius)',
                    background: 'var(--bg-3)', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', fontSize: 12, fontWeight: 500,
                    textDecoration: 'none', transition: 'all var(--t-fast)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-4)'; e.currentTarget.style.color = 'var(--text)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3" /></svg>
                  Download
                </a>
                <button onClick={() => deleteFile(file.id, file.original_name)} className="btn-icon" title="Delete" style={{ color: 'var(--text-subtle)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18 M6 6l12 12" /></svg>
                </button>
              </div>
            )
          })}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
