import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const THEMES = {
  dark: {
    '--bg':        '#07070b',
    '--bg-2':      '#0d0d12',
    '--bg-3':      '#13131a',
    '--bg-4':      '#1a1a24',
    '--bg-hover':  'rgba(255,255,255,0.04)',
    '--border':       'rgba(255,255,255,0.07)',
    '--border-hover': 'rgba(255,255,255,0.14)',
    '--border-focus': 'rgba(124,111,253,0.6)',
    '--text':         '#f0f0f8',
    '--text-2':       '#c4c4d8',
    '--text-muted':   '#6b6b8a',
    '--text-subtle':  '#3e3e55',
  },
  dim: {
    '--bg':        '#0f0f17',
    '--bg-2':      '#161620',
    '--bg-3':      '#1e1e2a',
    '--bg-4':      '#252533',
    '--bg-hover':  'rgba(255,255,255,0.05)',
    '--border':       'rgba(255,255,255,0.1)',
    '--border-hover': 'rgba(255,255,255,0.18)',
    '--border-focus': 'rgba(124,111,253,0.65)',
    '--text':         '#eeeef8',
    '--text-2':       '#b8b8d0',
    '--text-muted':   '#7070a0',
    '--text-subtle':  '#4a4a6a',
  },
  light: {
    '--bg':        '#f5f5fa',
    '--bg-2':      '#ffffff',
    '--bg-3':      '#f0f0f7',
    '--bg-4':      '#e8e8f2',
    '--bg-hover':  'rgba(0,0,0,0.04)',
    '--border':       'rgba(0,0,0,0.08)',
    '--border-hover': 'rgba(0,0,0,0.15)',
    '--border-focus': 'rgba(124,111,253,0.5)',
    '--text':         '#111118',
    '--text-2':       '#3a3a50',
    '--text-muted':   '#7070a0',
    '--text-subtle':  '#b0b0cc',
  },
}

function applyTheme(name) {
  const vars = THEMES[name]
  if (!vars) return
  const root = document.documentElement
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
}

export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (name) => {
        applyTheme(name)
        set({ theme: name })
      },
    }),
    { name: 'precolab-theme' }
  )
)

// Apply saved theme on load
const saved = JSON.parse(localStorage.getItem('precolab-theme') || '{}')
applyTheme(saved?.state?.theme || 'dark')
