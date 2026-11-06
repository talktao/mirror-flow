import { useEffect } from 'react'
import { taskApi } from '../api/tasks'
import { useTaskStore } from '../stores/tasks'
import { useUiStore } from '../stores/ui'

/** 进入画布时拉取最近任务，刷新后仍能看到上次结果（P1 DoD #8）。 */
export function useCanvasTasks(canvasId: string | undefined) {
  const showNotice = useUiStore((s) => s.showNotice)

  useEffect(() => {
    if (!canvasId) return
    let alive = true

    void (async () => {
      try {
        const { items } = await taskApi.listByCanvas(canvasId, 20)
        if (!alive) return
        const store = useTaskStore.getState()
        store.upsertTasks(items)
        if (!store.activeByCanvas[canvasId] && items.length > 0) {
          store.setActiveTask(canvasId, items[0].id)
        }
      } catch (err) {
        if (!alive) return
        const message = err instanceof Error ? err.message : '未知错误'
        showNotice(`加载任务失败：${message}`)
      }
    })()

    return () => {
      alive = false
    }
  }, [canvasId, showNotice])
}
