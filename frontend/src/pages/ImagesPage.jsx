import React, { useEffect, useState, useRef } from 'react'
import ReactCrop from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'

export default function ImagesPage() {
  const { currentWorkspace } = useAuthStore()
  const [images, setImages] = useState([])
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(false)
  const [crop, setCrop] = useState({ unit: '%', width: 100 })
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const wid = currentWorkspace?.id

  useEffect(() => {
    if (!wid) return
    api.get(`/api/workspaces/${wid}/files/images`).then(r => setImages(r.data))
  }, [wid])

  async function handleUpload(e) {
    const files = e.target.files
    if (!files.length) return
    setUploading(true)
    const form = new FormData()
    Array.from(files).forEach(f => form.append('files', f))
    try {
      const { data } = await api.post(`/api/workspaces/${wid}/files/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImages(i => [...data, ...i])
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function deleteImage(id) {
    if (!confirm('Delete this image?')) return
    await api.delete(`/api/workspaces/${wid}/files/${id}`)
    setImages(i => i.filter(x => x.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const apiBase = import.meta.env.VITE_API_URL || ''

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, fontSize: 18 }}>Images</h2>
        <button onClick={() => fileRef.current.click()} className="btn-primary" disabled={uploading}>
          {uploading ? 'Uploading…' : '+ Upload'}
        </button>
        <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
      </div>

      {/* Gallery */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {images.map(img => (
          <div key={img.id} className="card" style={{ padding: 8, cursor: 'pointer', overflow: 'hidden' }}
            onClick={() => { setSelected(img); setEditing(false) }}>
            <img
              src={`${apiBase}/api/workspaces/${wid}/files/serve/${img.filename}`}
              alt={img.original_name}
              style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 6, display: 'block' }}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {img.original_name}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox / editor */}
      {selected && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div style={{ background: 'var(--bg-2)', borderRadius: 12, padding: 20, maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 600 }}>{selected.original_name}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setEditing(e => !e)} className="btn-ghost">
                  {editing ? 'Cancel' : 'Crop'}
                </button>
                <button onClick={() => deleteImage(selected.id)} className="btn-danger">Delete</button>
                <button onClick={() => setSelected(null)} className="btn-ghost">×</button>
              </div>
            </div>
            {editing ? (
              <ReactCrop crop={crop} onChange={c => setCrop(c)}>
                <img
                  src={`${apiBase}/api/workspaces/${wid}/files/serve/${selected.filename}`}
                  alt={selected.original_name}
                  style={{ maxWidth: '70vw', maxHeight: '70vh' }}
                />
              </ReactCrop>
            ) : (
              <img
                src={`${apiBase}/api/workspaces/${wid}/files/serve/${selected.filename}`}
                alt={selected.original_name}
                style={{ maxWidth: '70vw', maxHeight: '70vh', borderRadius: 8 }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
