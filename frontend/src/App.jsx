import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore.js'
import { useConfigStore } from './store/configStore.js'
import ToastContainer from './components/ui/Toast.jsx'
import './store/themeStore.js' // apply saved theme on load
import WorkspaceShell from './components/layout/WorkspaceShell.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import KanbanPage from './pages/KanbanPage.jsx'
import DocPage from './pages/DocPage.jsx'
import TodoPage from './pages/TodoPage.jsx'
import ChatPage from './pages/ChatPage.jsx'
import WhiteboardPage from './pages/WhiteboardPage.jsx'
import MindMapPage from './pages/MindMapPage.jsx'
import ImagesPage from './pages/ImagesPage.jsx'
import FilesPage from './pages/FilesPage.jsx'
import ActivityPage from './pages/ActivityPage.jsx'
import PollsPage from './pages/PollsPage.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import JoinPage from './pages/JoinPage.jsx'

function ProtectedRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  return user ? <Navigate to="/" replace /> : children
}

export default function App() {
  const setConfig = useConfigStore((s) => s.setConfig)

  useEffect(() => {
    fetch('/api/config')
      .then((r) => { if (!r.ok) throw new Error('config fetch failed'); return r.json() })
      .then(setConfig)
      .catch(() => setConfig({ workspaceMode: 'multi' }))
  }, [setConfig])

  return (
    <>
    <ToastContainer />
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/join" element={<JoinPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <WorkspaceShell>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/kanban" element={<KanbanPage />} />
                <Route path="/docs/:docId?" element={<DocPage />} />
                <Route path="/todos" element={<TodoPage />} />
                <Route path="/chat/:roomId?" element={<ChatPage />} />
                <Route path="/whiteboard/:boardId?" element={<WhiteboardPage />} />
                <Route path="/mindmap/:mapId?" element={<MindMapPage />} />
                <Route path="/images" element={<ImagesPage />} />
                <Route path="/files" element={<FilesPage />} />
                <Route path="/activity" element={<ActivityPage />} />
                <Route path="/polls" element={<PollsPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </WorkspaceShell>
          </ProtectedRoute>
        }
      />
    </Routes>
    </>
  )
}
