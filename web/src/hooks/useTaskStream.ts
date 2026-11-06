import { useEffect } from 'react'
import { taskApi } from '../api/tasks'
import { isTaskTerminal } from '../lib/taskStatus'
import { useTaskStore } from '../stores/tasks'

const SSE_EVENTS = ['snapshot', 'status', 'progress', 'asset', 'error', 'done']

/**
 * 订阅任务事件：SSE 优先，连续失败 3 次后降级为 2s 轮询（方案 §8.4）。
 * 终态事件到达即关闭连接，避免无意义长连接。
 */
export function useTaskStream(taskId: string | null) {
  const applyEvent = useTaskStore((s) => s.applyEvent)

  useEffect(() => {
    if (!taskId) return
    const initial = useTaskStore.getState().byId[taskId]
    if (initial && isTaskTerminal(initial.status)) return

    let source: EventSource | null = null
    let pollTimer: number | undefined
    let failures = 0
    let stopped = false

    const stop = () => {
      stopped = true
      source?.close()
      source = null
      if (pollTimer !== undefined) {
        window.clearInterval(pollTimer)
        pollTimer = undefined
      }
    }

    const stillOpen = () => {
      if (stopped) return false
      const current = useTaskStore.getState().byId[taskId]
      return !current || !isTaskTerminal(current.status)
    }

    const startPolling = () => {
      if (pollTimer !== undefined) return
      pollTimer = window.setInterval(() => {
        if (!stillOpen()) {
          stop()
          return
        }
        taskApi
          .get(taskId)
          .then((detail) => applyEvent(taskId, 'snapshot', { task: detail.item, assets: detail.assets }))
          .catch(() => {
            // 单次轮询失败继续等下一轮。
          })
      }, 2000)
    }

    const connect = () => {
      if (stopped) return
      source = new EventSource(taskApi.eventsUrl(taskId))
      source.onopen = () => {
        failures = 0
      }
      source.onerror = () => {
        failures += 1
        if (failures >= 3) {
          source?.close()
          source = null
          startPolling()
        }
      }

      for (const type of SSE_EVENTS) {
        source.addEventListener(type, (raw: Event) => {
          if (!(raw instanceof MessageEvent) || typeof raw.data !== 'string') return
          let payload: unknown
          try {
            payload = JSON.parse(raw.data)
          } catch {
            return
          }
          applyEvent(taskId, type, payload)
          if (type === 'done') stop()
        })
      }
    }

    connect()

    const onVisibility = () => {
      if (document.visibilityState !== 'visible' || stopped || pollTimer !== undefined) return
      if (source === null || source.readyState === EventSource.CLOSED) {
        failures = 0
        connect()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
    }
  }, [taskId, applyEvent])
}
