import { create } from 'zustand'
import type { Canvas } from '../types'

interface CanvasState {
  items: Canvas[]
  activeId: string
  loading: boolean
  loaded: boolean
  setItems: (items: Canvas[]) => void
  setActiveId: (id: string) => void
  upsert: (item: Canvas) => void
  remove: (id: string) => void
  setLoading: (loading: boolean) => void
  setLoaded: (loaded: boolean) => void
}

/** 画布列表与当前画布是全局状态；请求本身放在 hooks/useCanvases。 */
export const useCanvasStore = create<CanvasState>()((set) => ({
  items: [],
  activeId: '',
  loading: false,
  loaded: false,

  setItems: (items) =>
    set((state) => ({
      items,
      // 原选中项被删除时自动落到第一张，避免界面显示空 id。
      activeId: items.some((item) => item.id === state.activeId)
        ? state.activeId
        : (items[0]?.id ?? ''),
    })),

  setActiveId: (activeId) => set({ activeId }),

  upsert: (item) =>
    set((state) => ({
      items: state.items.some((prev) => prev.id === item.id)
        ? state.items.map((prev) => (prev.id === item.id ? item : prev))
        : [item, ...state.items],
      activeId: item.id,
    })),

  remove: (id) =>
    set((state) => {
      const items = state.items.filter((item) => item.id !== id)
      return {
        items,
        activeId: state.activeId === id ? (items[0]?.id ?? '') : state.activeId,
      }
    }),

  setLoading: (loading) => set({ loading }),
  setLoaded: (loaded) => set({ loaded }),
}))
