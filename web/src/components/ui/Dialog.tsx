import { useEffect, type ReactNode } from 'react'
import { Button } from './Button'
import { Icon } from './Icon'

interface DialogProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/** 轻量弹窗外壳：遮罩 + 标题 + 内容，Esc 与点击遮罩都能关闭。 */
export function Dialog({ open, title, onClose, children }: DialogProps) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold">{title}</h2>
          <Button variant="ghost" size="iconSm" shape="square" aria-label="关闭" onClick={onClose}>
            <Icon name="close" className="size-3.5" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}
