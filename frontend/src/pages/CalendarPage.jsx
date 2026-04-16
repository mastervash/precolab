import React, { useEffect, useState } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'
import { toast } from '../components/ui/Toast.jsx'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales: { 'en-US': enUS },
})

const EVENT_COLORS = ['#7c6ffd', '#10b981', '#f59e0b', '#f0455a', '#3b82f6', '#a78bfa']

export default function CalendarPage() {
  const { currentWorkspace } = useAuthStore()
  const [events, setEvents] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [newEvent, setNewEvent] = useState({ title: '', startAt: '', endAt: '', allDay: false, color: EVENT_COLORS[0] })
  const wid = currentWorkspace?.id

  useEffect(() => {
    if (!wid) return
    api.get(`/api/workspaces/${wid}/calendar`).then(r => {
      setEvents(r.data.map(ev => ({
        ...ev,
        start: new Date(ev.start_at),
        end: new Date(ev.end_at),
        allDay: ev.all_day,
      })))
    })
  }, [wid])

  function handleSelectSlot({ start, end }) {
    setNewEvent({
      title: '',
      startAt: start.toISOString().slice(0, 16),
      endAt: end.toISOString().slice(0, 16),
      allDay: false,
      color: EVENT_COLORS[0],
    })
    setModalOpen(true)
  }

  async function createEvent() {
    if (!newEvent.title.trim()) return
    try {
      const { data } = await api.post(`/api/workspaces/${wid}/calendar`, {
        title: newEvent.title.trim(),
        startAt: new Date(newEvent.startAt).toISOString(),
        endAt: new Date(newEvent.endAt).toISOString(),
        allDay: newEvent.allDay,
        color: newEvent.color,
      })
      setEvents(e => [...e, { ...data, start: new Date(data.start_at), end: new Date(data.end_at), allDay: data.all_day }])
      setModalOpen(false)
      toast.success('Event created')
    } catch {
      toast.error('Failed to create event')
    }
  }

  async function deleteEvent(ev) {
    if (!confirm(`Delete "${ev.title}"?`)) return
    await api.delete(`/api/workspaces/${wid}/calendar/${ev.id}`)
    setEvents(e => e.filter(x => x.id !== ev.id))
    toast.info('Event deleted')
  }

  return (
    <div style={{ padding: '20px 24px', height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="page-header" style={{ margin: 0 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 4h18v18H3z M16 2v4 M8 2v4 M3 10h18" /></svg>
        <h2 className="page-title">Calendar</h2>
        <div style={{ flex: 1 }} />
        <button onClick={() => setModalOpen(true)} className="btn-primary" style={{ fontSize: 12 }}>+ New Event</button>
      </div>

      <style>{`
        .rbc-calendar {
          background: var(--bg-2);
          border-radius: var(--radius-xl);
          border: 1px solid var(--border);
          color: var(--text);
          font-family: inherit;
        }
        .rbc-header {
          background: var(--bg-3);
          border-color: var(--border) !important;
          padding: 10px 0;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .rbc-toolbar {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 0;
        }
        .rbc-toolbar button {
          color: var(--text-muted);
          background: var(--bg-3);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          font-family: inherit;
          font-size: 12px;
          padding: 5px 12px;
          transition: all var(--t-fast);
        }
        .rbc-toolbar button:hover { border-color: var(--border-hover); color: var(--text); background: var(--bg-4); }
        .rbc-toolbar button.rbc-active,
        .rbc-toolbar button.rbc-active:hover { background: var(--primary-dim); color: var(--primary); border-color: rgba(124,111,253,0.3); }
        .rbc-toolbar-label { font-weight: 700; font-size: 14px; color: var(--text); }
        .rbc-month-view, .rbc-time-view, .rbc-agenda-view { border: none !important; }
        .rbc-day-bg + .rbc-day-bg,
        .rbc-month-row + .rbc-month-row { border-color: var(--border) !important; }
        .rbc-month-row { border-color: var(--border) !important; }
        .rbc-off-range-bg { background: var(--bg) !important; }
        .rbc-off-range .rbc-button-link { color: var(--text-subtle) !important; }
        .rbc-today { background: rgba(124,111,253,0.05) !important; }
        .rbc-date-cell { padding: 6px 8px; font-size: 12px; }
        .rbc-button-link { color: var(--text-muted); font-size: 12px; }
        .rbc-event {
          border-radius: 5px !important;
          font-size: 11px;
          font-weight: 500;
          border: none !important;
          padding: 2px 6px;
        }
        .rbc-event:focus { outline: none; }
        .rbc-show-more { color: var(--primary); font-size: 11px; }
        .rbc-time-header { border-color: var(--border) !important; }
        .rbc-time-content { border-color: var(--border) !important; }
        .rbc-timeslot-group { border-color: var(--border) !important; }
        .rbc-time-slot { color: var(--text-subtle); font-size: 11px; }
        .rbc-current-time-indicator { background: var(--primary); }
      `}</style>

      <div style={{ flex: 1, minHeight: 0 }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={deleteEvent}
          eventPropGetter={ev => ({
            style: {
              backgroundColor: ev.color || '#7c6ffd',
              boxShadow: `0 2px 8px ${ev.color || '#7c6ffd'}40`,
            }
          })}
        />
      </div>

      {modalOpen && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div style={{
            background: 'var(--bg-2)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-hover)',
            padding: 24,
            width: 420,
            display: 'flex', flexDirection: 'column', gap: 14,
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700, fontSize: 15 }}>New Event</h3>
              <button onClick={() => setModalOpen(false)} className="btn-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18 M6 6l12 12" /></svg>
              </button>
            </div>
            <div>
              <label>Title</label>
              <input autoFocus value={newEvent.title} onChange={e => setNewEvent(n => ({ ...n, title: e.target.value }))} onKeyDown={e => e.key === 'Enter' && createEvent()} placeholder="Event name…" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label>Start</label><input type="datetime-local" value={newEvent.startAt} onChange={e => setNewEvent(n => ({ ...n, startAt: e.target.value }))} /></div>
              <div><label>End</label><input type="datetime-local" value={newEvent.endAt} onChange={e => setNewEvent(n => ({ ...n, endAt: e.target.value }))} /></div>
            </div>
            <div>
              <label style={{ marginBottom: 6, display: 'block' }}>Color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {EVENT_COLORS.map(c => (
                  <button key={c} onClick={() => setNewEvent(n => ({ ...n, color: c }))} style={{
                    width: 24, height: 24, borderRadius: '50%', background: c, border: 'none',
                    cursor: 'pointer', flexShrink: 0,
                    outline: newEvent.color === c ? `3px solid ${c}` : 'none',
                    outlineOffset: 2,
                    transition: 'outline 0.15s',
                  }} />
                ))}
              </div>
            </div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)' }}>
              <input type="checkbox" checked={newEvent.allDay} onChange={e => setNewEvent(n => ({ ...n, allDay: e.target.checked }))} style={{ width: 'auto', accentColor: 'var(--primary)' }} />
              All day event
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={createEvent} className="btn-primary" style={{ flex: 1 }}>Create Event</button>
              <button onClick={() => setModalOpen(false)} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
