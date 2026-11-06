import { create } from 'zustand'
import type { Asset, Task, TaskStatus } from '../types'

const TASK_STATUSES: TaskStatus[] = ['queued', 'running', 'succeeded', 'failed', 'canceled']

interface TaskState {
  byId: Record<string, Task>
  activeByCanvas: Record<string, string>
  assetsByTask: Record<string, Asset[]>
  upsertTask: (task: Task) => void
  upsertTasks: (tasks: Task[]) => void
  setActiveTask: (canvasId: string, taskId: string) => void
  setAssets: (taskId: string, assets: Asset[]) => void
  applyEvent: (taskId: string, type: string, payload: unknown) => void
}

export const useTaskStore = create<TaskState>()((set) => ({
  byId: {},
  activeByCanvas: {},
  assetsByTask: {},

  upsertTask: (task) =>
    set((state) => ({ byId: { ...state.byId, [task.id]: task } })),

  upsertTasks: (tasks) =>
    set((state) => {
      const byId = { ...state.byId }
      for (const task of tasks) byId[task.id] = task
      return { byId }
    }),

  setActiveTask: (canvasId, taskId) =>
    set((state) => ({
      activeByCanvas: { ...state.activeByCanvas, [canvasId]: taskId },
    })),

  setAssets: (taskId, assets) =>
    set((state) => ({ assetsByTask: { ...state.assetsByTask, [taskId]: assets } })),

  applyEvent: (taskId, type, raw) =>
    set((state) => {
      const payload = isRecord(raw) ? raw : null
      if (!payload) return state

      if (type === 'snapshot') {
        const task = payload.task
        if (!isTask(task)) return state
        const assets = Array.isArray(payload.assets)
          ? payload.assets.filter(isAsset)
          : state.assetsByTask[taskId] ?? []
        return {
          byId: { ...state.byId, [task.id]: task },
          assetsByTask: { ...state.assetsByTask, [taskId]: assets },
        }
      }

      const current = state.byId[taskId]
      if (!current) return state

      if (type === 'status' || type === 'done') {
        if (!isTaskStatus(payload.status)) return state
        const phase = typeof payload.phase === 'string' ? payload.phase : current.phase
        return {
          byId: { ...state.byId, [taskId]: { ...current, status: payload.status, phase } },
        }
      }

      if (type === 'error') {
        return {
          byId: {
            ...state.byId,
            [taskId]: {
              ...current,
              status: 'failed',
              error_code: typeof payload.code === 'string' ? payload.code : 'INTERNAL',
              error_msg: typeof payload.message === 'string' ? payload.message : '生成失败',
            },
          },
        }
      }

      if (type === 'asset') {
        const asset = toAsset(taskId, payload)
        if (!asset) return state
        const existing = state.assetsByTask[taskId] ?? []
        if (existing.some((item) => item.id === asset.id)) return state
        return {
          assetsByTask: { ...state.assetsByTask, [taskId]: [...existing, asset] },
        }
      }

      return state
    }),
}))

export function selectCanvasTasks(byId: Record<string, Task>, canvasId: string): Task[] {
  return Object.values(byId)
    .filter((task) => task.canvas_id === canvasId)
    .sort((a, b) => b.created_at - a.created_at)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && TASK_STATUSES.includes(value as TaskStatus)
}

function isTask(value: unknown): value is Task {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.canvas_id === 'string' &&
    typeof value.prompt === 'string' &&
    typeof value.error_msg === 'string' &&
    typeof value.created_at === 'number' &&
    isTaskStatus(value.status)
  )
}

function isAsset(value: unknown): value is Asset {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.task_id === 'string' &&
    typeof value.mime_type === 'string'
  )
}

function toAsset(taskId: string, payload: Record<string, unknown>): Asset | null {
  const id = payload.asset_id
  if (typeof id !== 'string') return null
  return {
    id,
    task_id: taskId,
    role: 'output',
    kind: typeof payload.kind === 'string' ? payload.kind : 'image',
    storage_key: '',
    mime_type: 'image/png',
    size_bytes: 0,
    width: typeof payload.width === 'number' ? payload.width : 0,
    height: typeof payload.height === 'number' ? payload.height : 0,
    duration_ms: 0,
    sha256: '',
    source_url: '',
    created_at: Date.now(),
  }
}
