import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { HealthInfo } from '../types'

export type ConnState = 'checking' | 'online' | 'offline'

/** 轮询 /healthz，用来证明前端与 Go 服务已打通 */
export function useHealth(intervalMs = 15000) {
  const [state, setState] = useState<ConnState>('checking')
  const [info, setInfo] = useState<HealthInfo | null>(null)

  useEffect(() => {
    let alive = true

    const check = async () => {
      try {
        const health = await api.health()
        if (!alive) return
        setInfo(health)
        setState('online')
      } catch {
        if (!alive) return
        setState('offline')
      }
    }

    void check()
    const timer = window.setInterval(() => void check(), intervalMs)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [intervalMs])

  return { state, info }
}
