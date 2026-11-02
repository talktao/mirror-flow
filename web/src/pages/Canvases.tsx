import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CanvasCard } from '../components/canvas/CanvasCard'
import { CanvasFormDialog } from '../components/canvas/CanvasFormDialog'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { Icon } from '../components/ui/Icon'
import { useCanvases } from '../hooks/useCanvases'
import { useCanvasStore } from '../stores/canvas'
import { useUiStore } from '../stores/ui'
import type { Canvas, CanvasInput } from '../types'

type FormState = { mode: 'create' } | { mode: 'rename'; canvas: Canvas }

function NewCanvasTile({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="dashed"
      shape="rounded"
      aria-label="新建画布"
      onClick={onClick}
      className="min-h-[214px] flex-col gap-3"
    >
      <span className="flex size-10 items-center justify-center rounded-full border border-line bg-surface text-muted">
        <Icon name="plus" className="size-4" />
      </span>
      <span className="text-[12.5px]">新建项目</span>
    </Button>
  )
}

export default function Canvases() {
  const items = useCanvasStore((s) => s.items)
  const setActiveId = useCanvasStore((s) => s.setActiveId)
  const navigate = useNavigate()
  const showNotice = useUiStore((s) => s.showNotice)
  const { createCanvas, renameCanvas, deleteCanvas } = useCanvases()

  const [form, setForm] = useState<FormState | null>(null)
  const [deleting, setDeleting] = useState<Canvas | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleOpen = (canvas: Canvas) => {
    setActiveId(canvas.id)
    navigate(`/canvas/${canvas.id}`)
  }

  const handleSubmit = async (input: CanvasInput) => {
    setSubmitting(true)
    const result =
      form?.mode === 'rename'
        ? await renameCanvas(form.canvas.id, input)
        : await createCanvas(input)
    setSubmitting(false)
    if (result) setForm(null)
  }

  const handleDelete = async () => {
    if (!deleting) return
    setSubmitting(true)
    const ok = await deleteCanvas(deleting.id)
    setSubmitting(false)
    if (ok) setDeleting(null)
  }

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="flex h-14 items-center justify-between border-b border-line-soft bg-canvas/80 px-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-accent to-accent-soft text-white shadow-[0_0_18px_rgba(139,92,246,0.35)]">
            <Icon name="cat" className="size-[18px]" strokeWidth={1.8} />
          </div>
          <div>
            <div className="text-[15px] font-semibold">全部画布</div>
            <div className="text-[10.5px] text-muted">{items.length} 张画布</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="soft" size="sm" onClick={() => setForm({ mode: 'create' })}>
            <Icon name="plus" className="size-3.5" />
            新建画布
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => showNotice('P0 骨架：API 配置面板尚未接入')}
          >
            <Icon name="sliders" className="size-3.5" />
            配置 API
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
          <NewCanvasTile onClick={() => setForm({ mode: 'create' })} />
          {items.map((canvas) => (
            <CanvasCard
              key={canvas.id}
              canvas={canvas}
              onOpen={handleOpen}
              onRename={(target) => setForm({ mode: 'rename', canvas: target })}
              onDelete={setDeleting}
            />
          ))}
        </div>
      </main>

      {form && (
        <CanvasFormDialog
          key={form.mode === 'rename' ? form.canvas.id : 'create'}
          open
          mode={form.mode}
          initial={form.mode === 'rename' ? form.canvas : undefined}
          submitting={submitting}
          onClose={() => setForm(null)}
          onSubmit={handleSubmit}
        />
      )}

      <Dialog
        open={deleting !== null}
        title="删除画布"
        onClose={() => {
          if (!submitting) setDeleting(null)
        }}
      >
        <p className="text-[12px] text-muted">
          确定删除「{deleting?.name}」吗？此操作不可撤销。
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" disabled={submitting} onClick={() => setDeleting(null)}>
            取消
          </Button>
          <Button variant="primary" size="sm" disabled={submitting} onClick={() => void handleDelete()}>
            {submitting ? '删除中…' : '删除'}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
