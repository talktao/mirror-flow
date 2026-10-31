import { create } from 'zustand'

/** P0 只有占位数据结构，任务提交与轮询在 P1 接入 */
export interface TaskSummary {
  id: string
  prompt: string
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled'
  createdAt: number
}

interface TaskState {
  history: TaskSummary[]
}

export const useTaskStore = create<TaskState>()(() => ({
  history: [],
}))
