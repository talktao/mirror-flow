import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { ModelInfo } from '../types'

/** 模型目录由后端 /api/v1/models 提供，前端不硬编码厂商 */
export function useModels() {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    api
      .models()
      .then((res) => {
        if (alive) setModels(res.items)
      })
      .catch(() => {
        if (alive) setModels([])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  return { models, loading }
}
