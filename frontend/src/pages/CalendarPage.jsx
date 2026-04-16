import React, { useEffect, useState } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import api from '../api/client.js'
import { useAuthStore } from '../store/authStore.js'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales: { 'en-US': enUS },
})

export default function CalendarPage() {
  const { currentWorkspace, user } = useAuthStore()
  const [events, setEvents] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [newEvent, setNewEvent] = useState({ title: '', startAt: '', endAt: '', allDay: false })
  const [selectedSlot, setSelectedSlot] = useState(null)
  const wid = currentWorkspace?.id

  useEffect(() => {
    if (!wid) return
    api.get(`/api/workspaces/${wid}/calendar`).then(r => {
      setEvents(r.data.map(ev => ({
        ...ev,
        start: new Date(ev.start_at),
        end: new Date(ev.end_at),
        allDay: ev.all_day,
        style: { backgroundColor: ev.color || '#6366f1' },
      })))
    })
  }, [wid])

  function handleSelectSlot({ start, end }) {
    setSelectedSlot({ start, end })
    setNewEvent({
      title: '',
      startAt: start.toISOString().slice(0, 16),
      endAt: end.toISOString().slice(0, 16),
      allDay: false,
    })
    setModalOpen(true)
  }

  async function createEvent() {
    if (!newEvent.title.trim()) return
    const { data } = await api.post(`/api/workspaces/${wid}/calendar`, {
      title: newEvent.title.trim(),
      startAt: new Date(newEvent.startAt).toISOString(),
      endAt: new Date(newEvent.endAt).toISOString(),
      allDay: newEvent.allDay,
    })
    setEvents(e => [...e, { ...data, start: new Date(data.start_at), end: new Date(data.end_at), allDay: data.all_day }])
    setModalOpen(false)
  }

  async function deleteEvent(id) {
    await api.delete(`/api/workspaces/${wid}/calendar/${id}`)
    setEvents(e => e.filter(x => x.id !== id))
  }

  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h2 style={{ fontWeight: 700, fontSize: 18 }}>Calendar</h2>
        <button onClick={() => setModalOpen(true)} className="btn-primary">+ Event</button>
      </div>

      <style>{`
        .rbc-calendar { background: var(--bg-2); border-radius: 12px; border: 1px solid var(--border); color: var(--text); }
        .rbc-header, .rbc-month-header { background: var(--bg-3); border-color: var(--border) !important; }
        .rbc-toolbar button { color: var(--text); background: var(--bg-3); border-color: var(--border); }
        .rbc-toolbar button.rbc-active { background: var(--primary); color: #fff; }
        .rbc-day-bg, .rbc-month-row { border-color: var(--border) !important; }
        .rbc-off-range-bg { background: var(--bg); }
        .rbc-today { background: rgba(99,102,241,0.05); }
        .rbc-event { border-radius: 4px; font-size: 12px; }
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
          onSelectEvent={ev => { if (confirm(`Delete "${ev.title}"?`)) deleteEvent(ev.id) }}
          eventPropGetter={ev => ({ style: { backgroundColor: ev.color || '#6366f1', border: 'none' } })}
        />
      </div>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="card" style={{ width: 400, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontWeight: 700 }}>New Event</h3>
            <div><label>Title</label><input autoFocus value={newEvent.title} onChange={e => setNewEvent(n => ({ ...n, title: e.target.value }))} /></div>
            <div><label>Start</label><input type="datetime-local" value={newEvent.startAt} onChange={e => setNewEvent(n => ({ ...n, startAt: e.target.value }))} /></div>
            <div><label>End</label><input type="datetime-local" value={newEvent.endAt} onChange={e => setNewEvent(n => ({ ...n, endAt: e.target.value }))} /></div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={newEvent.allDay} onChange={e => setNewEvent(n => ({ ...n, allDay: e.target.checked }))} style={{ width: 'auto' }} />
              All day
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={createEvent} className="btn-primary" style={{ flex: 1 }}>Create</button>
              <button onClick={() => setModalOpen(false)} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
