import React, { useEffect } from 'react'
import { create } from 'zustand'

/* ─── Store ─────────────────────────────────────────────────── */
let _id = 0
export const useToastStore = create((set) => ({
  toasts: [],
  add: (message, type = 'info', duration = 3500) => {
    const id = ++_id
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), duration)
    return id
  },
  remove: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

/* ─── Convenience helpers ───────────────────────────────────── */
export const toast = {
  success: (msg) => useToastStore.getState().add(msg, 'success'),
  error:   (msg) => useToastStore.getState().add(msg, 'error', 5000),
  info:    (msg) => useToastStore.getState().add(msg, 'info'),
  warn:    (msg) => useToastStore.getState().add(msg, 'warn'),
}

/* ─── Icons ─────────────────────────────────────────────────── */
const ICONS = {
  success: { d: 'M20 6L9 17l-5-5', color: '#34d399' },
  error:   { d: 'M18 6L6 18 M6 6l12 12', color: '#f0455a' },
  warn:    { d: 'M12 9v4 M12 17h.01 M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', color: '#fbbf24' },
  info:    { d: 'M12 16v-4 M12 8h.01 M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', color: '#7c6ffd' },
}

/* ─── Single Toast ──────────────────────────────────────────── */
function ToastItem({ toast: t }) {
  const remove = useToastStore(s => s.remove)
  const icon = ICONS[t.type] || ICONS.info

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--bg-3)',
      border: '1px solid var(--border-hover)',
      borderLeft: `3px solid ${icon.color}`,
      borderRadius: 'var(--radius-lg)',
      padding: '12px 14px',
      minWidth: 280, maxWidth: 380,
      boxShadow: 'var(--shadow-lg)',
      animation: 'toast-in 0.2s ease',
      cursor: 'pointer',
    }} onClick={() => remove(t.id)}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={icon.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d={icon.d} />
      </svg>
      <span style={{ fontSize: 13, color: 'var(--text)', flex: 1, lineHeight: 1.4 }}>{t.message}</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
        <path d="M18 6L6 18 M6 6l12 12" />
      </svg>
    </div>
  )
}

/* ─── Container ─────────────────────────────────────────────── */
export default function ToastContainer() {
  const toasts = useToastStore(s => s.toasts)

  return (
    <>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div style={{
        position: 'fixed', bottom: 24, right: 24,
        display: 'flex', flexDirection: 'column', gap: 8,
        zIndex: 9999,
        pointerEvents: toasts.length ? 'all' : 'none',
      }}>
        {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
      </div>
    </>
  )
}
