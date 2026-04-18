import { create } from 'zustand'

export const useConfigStore = create((set) => ({
  workspaceMode: null,
  setConfig: ({ workspaceMode }) => set({ workspaceMode }),
}))
