import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      workspaces: [],
      currentWorkspace: null,
      accessToken: null,
      refreshToken: null,

      setAuth: (user, workspaces, accessToken, refreshToken) =>
        set({ user, workspaces, currentWorkspace: workspaces[0] || null, accessToken, refreshToken }),

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),

      logout: () => set({ user: null, workspaces: [], currentWorkspace: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'precolab-auth',
      partialize: (state) => ({
        user: state.user,
        workspaces: state.workspaces,
        currentWorkspace: state.currentWorkspace,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
)
