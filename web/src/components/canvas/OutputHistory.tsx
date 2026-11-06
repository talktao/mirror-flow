import { useMemo, useState } from 'react'
import { selectCanvasTasks, useTaskStore } from '../../stores/tasks'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

export function OutputHistory({ canvasId }: { canvasId: string }) {
  const byId = useTaskStore((s) => s.byId)
  const setActiveTask = useTaskStore((s) => s.setActiveTask)
  const [open, setOpen] = useState(false)

  const history = useMemo(() => selectCanvasTasks(byId, canvasId), [byId, canvasId])

  return (
    <div className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2">
      {open && (
        <div className="mb-2 w-[320px] rounded-xl border border-line bg-surface/95 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-medium">输出历史</span>
            <Button
              variant="ghost"
              size="iconSm"
              shape="square"
              aria-label="关闭"
              onClick={() => setOpen(false)}
            >
              <Icon name="close" className="size-3.5" />
            </Button>
          </div>
          {history.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-[11px] text-faint">
              暂无输出。提交后会在这里看到记录。
            </p>
          ) : (
            <ul className="max-h-[260px] space-y-1 overflow-y-auto">
              {history.map((task) => (
                <li key={task.id}>
                  <Button
                    variant="ghost"
                    size="sm"
                    shape="square"
                    align="start"
                    className="w-full"
                    onClick={() => {
                      setActiveTask(canvasId, task.id)
                      setOpen(false)
                    }}
                  >
                    <span className="truncate text-[11px]">{task.prompt}</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Button variant="pill" size="sm" shape="pill" onClick={() => setOpen((v) => !v)}>
        <Icon name="history" className="size-3.5 text-muted" />
        输出历史
        <span className="rounded-full bg-white/8 px-1.5 text-[10px] text-muted">
          {history.length}
        </span>
      </Button>
    </div>
  )
}
