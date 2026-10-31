import { create } from 'zustand'

interface UiState {
  notice: string | null
  showNotice: (message: string) => void
  clearNotice: () => void
}

export const useUiStore = create<UiState>()((set) => ({
  notice: null,
  showNotice: (message) => set({ notice: message }),
  clearNotice: () => set({ notice: null }),
}))
