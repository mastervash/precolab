import React, { useEffect, useState, useRef } from 'react'
import ReactCrop from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'
import { toast } from '../components/ui/Toast.jsx'

export default function ImagesPage() {
  const { currentWorkspace } = useAuthStore()
  const [images, setImages] = useState([])
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(false)
  const [crop, setCrop] = useState({ unit: '%', width: 80, x: 10, y: 10, height: 80 })
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const wid = currentWorkspace?.id
  const apiBase = import.meta.env.VITE_API_URL || ''

  useEffect(() => { if (wid) api.get(`/api/workspaces/${wid}/files/images`).then(r => setImages(r.data)) }, [wid])

  async function handleUpload(e) {
    const files = e.target.files
    if (!files.length) return
    setUploading(true)
    const form = new FormData()
    Array.from(files).forEach(f => form.append('files', f))
    try {
      const { data } = await api.post(`/api/workspaces/${wid}/files/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setImages(i => [...data, ...i])
      toast.success(`${data.length} image${data.length > 1 ? 's' : ''} uploaded`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function deleteImage(id) {
    await api.delete(`/api/workspaces/${wid}/files/${id}`)
    setImages(i => i.filter(x => x.id !== id))
    setSelected(null)
    toast.info('Image deleted')
  }

  const imgSrc = (filename) => `${apiBase}/api/workspaces/${wid}/files/serve/${filename}`

  return (
    <div className="page">
      <div className="page-header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M21 15l-5-5L5 21" /></svg>
        <h2 className="page-title">Images</h2>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{images.length} image{images.length !== 1 ? 's' : ''}</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => fileRef.current.click()} className="btn-primary" disabled={uploading} style={{ fontSize: 12 }}>
          {uploading ? 'Uploading…' : '+ Upload'}
        </button>
        <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
      </div>

      {images.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 32 }}>
          <div className="empty-state-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M21 15l-5-5L5 21" /></svg>
          </div>
          <div className="empty-state-title">No images yet</div>
          <div className="empty-state-desc">Upload images to share with your team</div>
          <button onClick={() => fileRef.current.click()} className="btn-primary" style={{ marginTop: 8 }}>Upload Images</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {images.map(img => (
            <div key={img.id}
              onClick={() => { setSelected(img); setEditing(false) }}
              style={{
                borderRadius: 'var(--radius-lg)', overflow: 'hidden', cursor: 'pointer',
                border: '1px solid var(--border)',
                transition: 'all var(--t)',
                background: 'var(--bg-2)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.transform = 'scale(1.02)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'scale(1)' }}
            >
              <img src={imgSrc(img.filename)} alt={img.original_name}
                style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {img.original_name}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selected && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div style={{
            background: 'var(--bg-2)', borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-hover)',
            padding: 20, maxWidth: '90vw', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column', gap: 14,
            boxShadow: 'var(--shadow-lg)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selected.original_name}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setEditing(e => !e)} className={editing ? 'btn-primary' : 'btn-ghost'} style={{ fontSize: 12 }}>
                  {editing ? 'Cropping…' : 'Crop'}
                </button>
                <button onClick={() => deleteImage(selected.id)} className="btn-danger" style={{ fontSize: 12 }}>Delete</button>
                <button onClick={() => setSelected(null)} className="btn-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18 M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            {/* Image */}
            <div style={{ overflow: 'auto' }}>
              {editing ? (
                <ReactCrop crop={crop} onChange={c => setCrop(c)}>
                  <img src={imgSrc(selected.filename)} alt={selected.original_name} style={{ maxWidth: '70vw', maxHeight: '70vh', borderRadius: 8 }} />
                </ReactCrop>
              ) : (
                <img src={imgSrc(selected.filename)} alt={selected.original_name} style={{ maxWidth: '70vw', maxHeight: '70vh', borderRadius: 8, display: 'block' }} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
