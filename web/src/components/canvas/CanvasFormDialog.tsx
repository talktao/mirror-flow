import { useState } from 'react'
import type { CanvasInput } from '../../types'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

interface CanvasFormDialogProps {
  open: boolean
  mode: 'create' | 'rename'
  initial?: { name: string; description: string }
  submitting: boolean
  onClose: () => void
  onSubmit: (input: CanvasInput) => void
}

const FIELD_CLASS =
  'w-full rounded-xl border border-line bg-canvas px-3 py-2 text-[12.5px] text-ink outline-none placeholder:text-faint focus:border-accent/60'

export function CanvasFormDialog({
  open,
  mode,
  initial,
  submitting,
  onClose,
  onSubmit,
}: CanvasFormDialogProps) {
  // 由父组件用 key 控制挂载：每次打开/切换目标都是新实例，初始值直接来自 props。
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || submitting) return
    onSubmit({ name: name.trim(), description: description.trim() })
  }

  return (
    <Dialog open={open} title={mode === 'create' ? '新建画布' : '重命名画布'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-[11px] text-muted">名称</span>
          <input
            autoFocus
            value={name}
            maxLength={40}
            placeholder="例如：第一张画布"
            className={FIELD_CLASS}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-[11px] text-muted">描述（可选）</span>
          <textarea
            value={description}
            maxLength={200}
            rows={3}
            placeholder="这张画布用来做什么"
            className={`${FIELD_CLASS} resize-none`}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={!name.trim() || submitting}>
            {submitting ? '保存中…' : '保存'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
