import { API_BASE, request } from './client'
import type { CanvasInput, CanvasItem, CanvasList } from '../types'

export const canvasApi = {
  list: () => request<CanvasList>(`${API_BASE}/canvases`),

  create: (input: CanvasInput) =>
    request<CanvasItem>(`${API_BASE}/canvases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),

  update: (id: string, input: CanvasInput) =>
    request<CanvasItem>(`${API_BASE}/canvases/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),

  remove: (id: string) => request<void>(`${API_BASE}/canvases/${id}`, { method: 'DELETE' }),
}
