import { useEffect } from 'react'
import { useModels } from '../../hooks/useModels'
import { useStudioStore } from '../../stores/studio'
import { useUiStore } from '../../stores/ui'
import type { Capability } from '../../types'
import { Icon } from '../ui/Icon'

const MODE_OPTIONS: { value: Capability; label: string }[] = [
  { value: 'text_to_image', label: '图像' },
  { value: 'text_to_video', label: '视频' },
]

export function ComposerCard() {
  const prompt = useStudioStore((s) => s.prompt)
  const setPrompt = useStudioStore((s) => s.setPrompt)
  const modelId = useStudioStore((s) => s.modelId)
  const setModelId = useStudioStore((s) => s.setModelId)
  const capability = useStudioStore((s) => s.capability)
  const setCapability = useStudioStore((s) => s.setCapability)
  const showNotice = useUiStore((s) => s.showNotice)
  const { models, loading } = useModels()

  useEffect(() => {
    if (modelId || models.length === 0) return
    const firstEnabled = models.find((m) => m.enabled) ?? models[0]
    setModelId(firstEnabled.id)
  }, [models, modelId, setModelId])

  const canSubmit = prompt.trim().length > 0 && modelId.length > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    showNotice('P0 骨架：任务创建接口将在 P1 接入')
  }

  return (
    <section className="relative w-full max-w-[600px] rounded-2xl border border-line bg-surface/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-soft text-white">
          <Icon name="cat" className="size-3.5" strokeWidth={1.9} />
        </div>
        <h1 className="text-[13.5px] font-medium text-ink">今天想做点什么？</h1>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            handleSubmit()
          }
        }}
        rows={3}
        placeholder="比如：把这个产品做成一张电影感海报"
        className="w-full resize-none bg-transparent text-[13px] leading-6 text-ink outline-none placeholder:text-faint"
      />

      <div className="mt-2 flex items-center gap-2 border-t border-line-soft pt-3">
        <span className="flex shrink-0 items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-accent-soft">
          <Icon name="sparkles" className="size-3" /> AI
        </span>

        <select
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          disabled={loading}
          className="max-w-[190px] flex-1 cursor-pointer truncate rounded-md bg-transparent py-1 text-[11.5px] text-zinc-300 outline-none disabled:cursor-wait"
        >
          {loading && <option>加载模型目录…</option>}
          {!loading && models.length === 0 && <option value="">请先配置模型</option>}
          {models.map((m) => (
            <option key={m.id} value={m.id} className="bg-surface-2 text-ink">
              {m.display_name}
              {m.enabled ? '' : '（未启用）'}
            </option>
          ))}
        </select>

        <span className="h-3 w-px bg-line" />

        <select
          value={capability}
          onChange={(e) => {
            const next = e.target.value as Capability
            setCapability(next)
            if (next !== 'text_to_image') showNotice('P0 骨架：视频生成能力将在 P2 接入')
          }}
          className="cursor-pointer rounded-md bg-transparent py-1 text-[11.5px] text-zinc-300 outline-none"
        >
          {MODE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-surface-2 text-ink">
              {o.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          aria-label="提交"
          className="ml-auto flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-soft text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Icon name="arrow-up" className="size-4" strokeWidth={2} />
        </button>
      </div>
    </section>
  )
}
