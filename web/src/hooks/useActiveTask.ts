import type { Asset, Task } from '../types'
import { useTaskStore } from '../stores/tasks'

export interface ActiveTaskView {
  taskId: string | undefined
  task: Task | undefined
  output: Asset | undefined
}

/** 当前画布正在查看的任务；TaskResultCard / MiniPreview 共用，避免重复取数逻辑。 */
export function useActiveTask(canvasId: string | undefined): ActiveTaskView {
  const taskId = useTaskStore((s) => (canvasId ? s.activeByCanvas[canvasId] : undefined))
  const task = useTaskStore((s) => (taskId ? s.byId[taskId] : undefined))
  const assets = useTaskStore((s) => (taskId ? s.assetsByTask[taskId] : undefined))

  const output = assets?.find((asset) => asset.role === 'output') ?? assets?.[0]
  return { taskId, task, output }
}
