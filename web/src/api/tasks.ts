import { API_BASE, request } from './client'
import type { CreateTaskInput, TaskDetail, TaskItem, TaskList } from '../types'

export const taskApi = {
  create: (input: CreateTaskInput) =>
    request<TaskItem>(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),

  get: (taskId: string) => request<TaskDetail>(`${API_BASE}/tasks/${taskId}`),

  listByCanvas: (canvasId: string, limit = 20) =>
    request<TaskList>(
      `${API_BASE}/tasks?canvas_id=${encodeURIComponent(canvasId)}&limit=${limit}`,
    ),

  /** EventSource 只接受 URL，SSE 走独立连接，不经过 fetch 封装。 */
  eventsUrl: (taskId: string) => `${API_BASE}/tasks/${taskId}/events`,

  assetUrl: (assetId: string) => `${API_BASE}/assets/${assetId}/file`,
}
