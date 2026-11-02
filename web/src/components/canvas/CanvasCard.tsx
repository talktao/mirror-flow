import { formatRelativeTime } from '../../lib/format'
import type { Canvas } from '../../types'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

interface CanvasCardProps {
  canvas: Canvas
  onOpen: (canvas: Canvas) => void
  onRename: (canvas: Canvas) => void
  onDelete: (canvas: Canvas) => void
}

export function CanvasCard({ canvas, onOpen, onRename, onDelete }: CanvasCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-accent/40">
      <button
        type="button"
        onClick={() => onOpen(canvas)}
        aria-label={`打开画布 ${canvas.name}`}
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <div className="relative flex h-[120px] items-center justify-center bg-gradient-to-br from-accent/20 via-surface-2 to-surface">
          <span className="absolute size-20 rotate-12 rounded-full border border-white/10" />
          <span className="absolute size-14 -rotate-12 rounded-full border border-white/10" />
          <span className="absolute size-8 rounded-full border border-white/15" />
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-canvas/70 px-2 py-0.5 text-[10px] text-zinc-300 backdrop-blur">
            <Icon name="canvas" className="size-3" />
            0 个节点
          </span>
        </div>

        <div className="p-3">
          <div className="truncate text-[13px] font-medium text-ink">{canvas.name}</div>
          <div className="mt-1 truncate text-[11px] text-muted">
            {canvas.description || '暂无描述'}
          </div>
          <div className="mt-1 text-[10.5px] text-faint">
            编辑于 {formatRelativeTime(canvas.updated_at)}
          </div>
        </div>
      </button>

      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <Button
          variant="ghost"
          size="iconSm"
          shape="square"
          aria-label={`重命名 ${canvas.name}`}
          onClick={() => onRename(canvas)}
          className="bg-canvas/70 backdrop-blur"
        >
          <Icon name="pencil" className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="iconSm"
          shape="square"
          aria-label={`删除 ${canvas.name}`}
          onClick={() => onDelete(canvas)}
          className="bg-canvas/70 backdrop-blur hover:text-rose-400"
        >
          <Icon name="trash" className="size-3.5" />
        </Button>
      </div>
    </article>
  )
}
