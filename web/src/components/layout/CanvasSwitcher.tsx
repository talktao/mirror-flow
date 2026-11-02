import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatRelativeTime } from '../../lib/format'
import { useCanvasStore } from '../../stores/canvas'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

/** 顶栏项目选择器：切换当前画布，或进入画布管理页。 */
export function CanvasSwitcher() {
  const items = useCanvasStore((s) => s.items)
  const activeId = useCanvasStore((s) => s.activeId)
  const setActiveId = useCanvasStore((s) => s.setActiveId)
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const active = items.find((item) => item.id === activeId)

  useEffect(() => {
    if (!open) return
    const handleMouseDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  return (
    <div className="relative" ref={rootRef}>
      <Button
        variant="outline"
        size="sm"
        align="start"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <div className="leading-tight">
          <div className="max-w-[140px] truncate text-[12.5px] text-ink">
            {active?.name ?? '暂无画布'}
          </div>
          <div className="text-[10.5px] text-muted">{items.length} 张画布</div>
        </div>
        <Icon name="chevron-down" className="size-3.5 text-muted" />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-40 mt-1 w-[260px] rounded-xl border border-line bg-surface/95 p-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.5)] backdrop-blur"
        >
          <div className="max-h-64 overflow-y-auto">
            {items.length === 0 && (
              <div className="px-2.5 py-3 text-[11px] text-muted">还没有画布，先新建一张。</div>
            )}
            {items.map((item) => (
              <Button
                key={item.id}
                role="menuitem"
                variant={item.id === activeId ? 'soft' : 'ghost'}
                size="sm"
                align="start"
                className="w-full"
                onClick={() => {
                  setActiveId(item.id)
                  navigate(`/canvas/${item.id}`)
                  setOpen(false)
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px]">{item.name}</div>
                  <div className="text-[10px] text-muted">
                    编辑于 {formatRelativeTime(item.updated_at)}
                  </div>
                </div>
                {item.id === activeId && <Icon name="check" className="size-3.5 text-accent-soft" />}
              </Button>
            ))}
          </div>

          <div className="mt-1 border-t border-line-soft pt-1">
            <Button
              variant="ghost"
              size="sm"
              align="start"
              className="w-full"
              onClick={() => {
                navigate('/')
                setOpen(false)
              }}
            >
              <Icon name="grid" className="size-3.5" />
              管理画布
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
