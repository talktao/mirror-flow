import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CanvasShell } from '../components/canvas/CanvasShell'
import { CapabilityBar } from '../components/canvas/CapabilityBar'
import { ComposerCard } from '../components/canvas/ComposerCard'
import { MiniPreview } from '../components/canvas/MiniPreview'
import { OutputHistory } from '../components/canvas/OutputHistory'
import { TaskResultCard } from '../components/canvas/TaskResultCard'
import { IconRail } from '../components/layout/IconRail'
import { TopBar } from '../components/layout/TopBar'
import { NoticeToast } from '../components/ui/NoticeToast'
import { useActiveTaskDetail } from '../hooks/useActiveTaskDetail'
import { useCanvasTasks } from '../hooks/useCanvasTasks'
import { useTaskStream } from '../hooks/useTaskStream'
import { useCanvasStore } from '../stores/canvas'
import { useTaskStore } from '../stores/tasks'
import { useUiStore } from '../stores/ui'

export default function Studio() {
  const { canvasId } = useParams<{ canvasId: string }>()
  const items = useCanvasStore((s) => s.items)
  const activeId = useCanvasStore((s) => s.activeId)
  const loaded = useCanvasStore((s) => s.loaded)
  const setActiveId = useCanvasStore((s) => s.setActiveId)
  const showNotice = useUiStore((s) => s.showNotice)
  const navigate = useNavigate()

  const activeTaskId = useTaskStore((s) =>
    canvasId ? s.activeByCanvas[canvasId] : undefined,
  )
  useCanvasTasks(canvasId)
  useActiveTaskDetail(activeTaskId)
  useTaskStream(activeTaskId ?? null)

  // URL 是当前画布的事实来源：进入 /canvas/:id 后同步 store，失效 id 回到首页。
  useEffect(() => {
    if (!canvasId) return
    if (items.some((item) => item.id === canvasId)) {
      if (activeId !== canvasId) setActiveId(canvasId)
      return
    }
    if (loaded) {
      showNotice('画布不存在或已被删除')
      navigate('/', { replace: true })
    }
  }, [canvasId, items, activeId, loaded, setActiveId, navigate, showNotice])

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-canvas text-ink">
      <TopBar />
      <div className="relative flex min-h-0 flex-1">
        <IconRail />
        <CanvasShell>
          {canvasId && <TaskResultCard canvasId={canvasId} />}
          <ComposerCard />
          <CapabilityBar />
        </CanvasShell>
      </div>
      <OutputHistory canvasId={canvasId ?? ''} />
      <MiniPreview canvasId={canvasId ?? ''} />
      <NoticeToast />
    </div>
  )
}
