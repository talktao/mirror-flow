import type { TaskStatus } from '../types'

export const TASK_STATUS_TEXT: Record<TaskStatus, string> = {
  queued: '排队中',
  running: '生成中',
  succeeded: '已完成',
  failed: '生成失败',
  canceled: '已取消',
}

export function isTaskTerminal(status: TaskStatus): boolean {
  return status === 'succeeded' || status === 'failed' || status === 'canceled'
}
