import { useEffect } from 'react'
import { taskApi } from '../api/tasks'
import { useTaskStore } from '../stores/tasks'

/** 切换当前任务时补一次详情，拿到完整任务与资产列表。 */
export function useActiveTaskDetail(taskId: string | undefined) {
  useEffect(() => {
    if (!taskId) return
    let alive = true

    taskApi
      .get(taskId)
      .then((detail) => {
        if (!alive) return
        const store = useTaskStore.getState()
        store.upsertTask(detail.item)
        store.setAssets(taskId, detail.assets)
      })
      .catch(() => {
        // 详情失败不阻塞画布；状态仍由 SSE / 轮询推送。
      })

    return () => {
      alive = false
    }
  }, [taskId])
}
