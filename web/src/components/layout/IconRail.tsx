import { useUiStore } from '../../stores/ui'
import { Button } from '../ui/Button'
import { Icon, type IconName } from '../ui/Icon'

interface RailItem {
  name: IconName
  label: string
  active?: boolean
}

const TOP_ITEMS: RailItem[] = [
  { name: 'plus', label: '新建节点' },
  { name: 'canvas', label: '画布列表' },
  { name: 'search', label: '搜索' },
  { name: 'folder', label: '素材库' },
  { name: 'image', label: '图片资产' },
  { name: 'link', label: '引用关系' },
  { name: 'history', label: '历史记录' },
]

const BOTTOM_ITEMS: RailItem[] = [
  { name: 'sparkles', label: 'AI 助手', active: true },
  { name: 'cat', label: '创作台' },
]

function RailButton({ item }: { item: RailItem }) {
  const showNotice = useUiStore((s) => s.showNotice)

  return (
    <Button
      variant={item.active ? 'soft' : 'ghost'}
      size="icon"
      shape="square"
      title={item.label}
      aria-label={item.label}
      onClick={() => showNotice(`P0 骨架：${item.label}尚未接入`)}
      className={item.active ? 'shadow-[0_0_14px_rgba(139,92,246,0.25)]' : undefined}
    >
      <Icon name={item.name} className="size-[17px]" />
    </Button>
  )
}

export function IconRail() {
  return (
    <aside className="relative z-20 hidden w-14 shrink-0 flex-col items-center justify-between border-r border-line-soft bg-canvas/60 py-3 sm:flex">
      <div className="flex flex-col items-center gap-1.5">
        {TOP_ITEMS.map((item) => (
          <RailButton key={item.name} item={item} />
        ))}
      </div>
      <div className="flex flex-col items-center gap-1.5">
        {BOTTOM_ITEMS.map((item) => (
          <RailButton key={item.name} item={item} />
        ))}
      </div>
    </aside>
  )
}
