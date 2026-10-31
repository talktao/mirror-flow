import { useState } from 'react'
import { useTaskStore } from '../../stores/tasks'
import { Icon } from '../ui/Icon'

export function OutputHistory() {
  const history = useTaskStore((s) => s.history)
  const [open, setOpen] = useState(false)

  return (
    <div className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2">
      {open && (
        <div className="mb-2 w-[320px] rounded-xl border border-line bg-surface/95 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-medium">输出历史</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="关闭"
              className="text-muted hover:text-ink"
            >
              <Icon name="close" className="size-3.5" />
            </button>
          </div>
          {history.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-[11px] text-faint">
              暂无输出。生成功能接入后，结果会出现在这里。
            </p>
          ) : (
            <ul className="space-y-1">
              {history.map((task) => (
                <li key={task.id} className="truncate rounded-lg bg-surface-2 px-2 py-1.5 text-[11px]">
                  {task.prompt}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3.5 py-1.5 text-[11.5px] text-zinc-300 shadow-lg backdrop-blur transition-colors hover:border-accent/50"
      >
        <Icon name="history" className="size-3.5 text-muted" />
        输出历史
        <span className="rounded-full bg-white/8 px-1.5 text-[10px] text-muted">{history.length}</span>
      </button>
    </div>
  )
}
