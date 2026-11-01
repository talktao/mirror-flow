import { useStudioStore } from '../../stores/studio'
import { useUiStore } from '../../stores/ui'
import type { Capability } from '../../types'
import { Button } from '../ui/Button'
import { Icon, type IconName } from '../ui/Icon'

interface Chip {
  icon: IconName
  label: string
  capability?: Capability
  hint: string
}

const CHIPS: Chip[] = [
  { icon: 'text', label: '文本提示词', hint: 'P0 骨架：文本节点将在 P1 接入' },
  { icon: 'image', label: '图像生成', capability: 'text_to_image', hint: '已切换到图像生成' },
  { icon: 'video', label: '视频生成', capability: 'text_to_video', hint: 'P0 骨架：视频生成能力将在 P2 接入' },
  { icon: 'upload', label: '上传参考图', hint: 'P0 骨架：文件上传将在 P4 接入' },
]

export function CapabilityBar() {
  const setCapability = useStudioStore((s) => s.setCapability)
  const showNotice = useUiStore((s) => s.showNotice)

  return (
    <div className="flex w-full max-w-[600px] flex-col items-center gap-3">
      <div className="flex items-center gap-2 rounded-full border border-line-soft bg-surface/50 px-2.5 py-1 text-[11px] text-muted">
        <Icon name="sparkles" className="size-3 text-accent-soft" />
        <span className="rounded border border-line px-1 text-[10px] text-zinc-400">右键</span>
        无限自由想象，世界由你创造
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {CHIPS.map((chip) => (
          <Button
            key={chip.label}
            variant="outline"
            size="sm"
            onClick={() => {
              if (chip.capability) setCapability(chip.capability)
              showNotice(chip.hint)
            }}
          >
            <Icon name={chip.icon} className="size-3.5 text-muted" />
            {chip.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
