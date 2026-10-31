import { create } from 'zustand'
import type { Capability } from '../types'

interface StudioState {
  prompt: string
  capability: Capability
  modelId: string
  setPrompt: (prompt: string) => void
  setCapability: (capability: Capability) => void
  setModelId: (modelId: string) => void
}

export const useStudioStore = create<StudioState>()((set) => ({
  prompt: '',
  capability: 'text_to_image',
  modelId: '',
  setPrompt: (prompt) => set({ prompt }),
  setCapability: (capability) => set({ capability }),
  setModelId: (modelId) => set({ modelId }),
}))
