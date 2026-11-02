import { useCallback, useEffect } from 'react'
import { canvasApi } from '../api/canvases'
import { useCanvasStore } from '../stores/canvas'
import { useUiStore } from '../stores/ui'
import type { Canvas, CanvasInput } from '../types'

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : '未知错误'
}

/** 画布 CRUD 组合逻辑：组件只拿动作，不直接碰 fetch。 */
export function useCanvases() {
  const loaded = useCanvasStore((s) => s.loaded)
  const setItems = useCanvasStore((s) => s.setItems)
  const setActiveId = useCanvasStore((s) => s.setActiveId)
  const upsert = useCanvasStore((s) => s.upsert)
  const remove = useCanvasStore((s) => s.remove)
  const setLoading = useCanvasStore((s) => s.setLoading)
  const setLoaded = useCanvasStore((s) => s.setLoaded)
  const showNotice = useUiStore((s) => s.showNotice)

  const refresh = useCallback(async () => {
    // StrictMode 下 effect 会执行两次，用同步的 loading 标记挡住重复请求。
    if (useCanvasStore.getState().loading) return
    setLoading(true)
    try {
      const data = await canvasApi.list()
      setItems(data.items)
      setLoaded(true)
    } catch (err) {
      showNotice(`加载画布失败：${errorText(err)}`)
    } finally {
      setLoading(false)
    }
  }, [setItems, setLoaded, setLoading, showNotice])

  useEffect(() => {
    if (!loaded) void refresh()
  }, [loaded, refresh])

  const createCanvas = useCallback(
    async (input: CanvasInput): Promise<Canvas | null> => {
      try {
        const { item } = await canvasApi.create(input)
        upsert(item)
        return item
      } catch (err) {
        showNotice(`创建画布失败：${errorText(err)}`)
        return null
      }
    },
    [upsert, showNotice],
  )

  const renameCanvas = useCallback(
    async (id: string, input: CanvasInput): Promise<Canvas | null> => {
      try {
        const { item } = await canvasApi.update(id, input)
        upsert(item)
        return item
      } catch (err) {
        showNotice(`更新画布失败：${errorText(err)}`)
        return null
      }
    },
    [upsert, showNotice],
  )

  const deleteCanvas = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await canvasApi.remove(id)
        remove(id)
        return true
      } catch (err) {
        showNotice(`删除画布失败：${errorText(err)}`)
        return false
      }
    },
    [remove, showNotice],
  )

  return { refresh, createCanvas, renameCanvas, deleteCanvas, selectCanvas: setActiveId }
}
