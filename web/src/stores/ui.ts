import { create } from 'zustand'

export type AppView = 'studio' | 'canvases'

interface UiState {
  view: AppView
  notice: string | null
  setView: (view: AppView) => void
  showNotice: (message: string) => void
  clearNotice: () => void
}

export const useUiStore = create<UiState>()((set) => ({
  view: 'studio',
  notice: null,
  setView: (view) => set({ view }),
  showNotice: (message) => set({ notice: message }),
  clearNotice: () => set({ notice: null }),
}))
