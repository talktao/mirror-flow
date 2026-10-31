import { Icon } from '../ui/Icon'

/** 右下角迷你预览面板（P0 纯占位） */
export function MiniPreview() {
  return (
    <div className="absolute right-4 bottom-4 z-30 hidden w-[180px] overflow-hidden rounded-xl border border-line bg-surface/90 shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur md:block">
      <div className="flex h-[104px] items-center justify-center bg-[#111114]">
        <span className="text-[11px] text-faint">画布预览</span>
      </div>
      <div className="flex items-center justify-between border-t border-line-soft px-2.5 py-1.5 text-muted">
        <Icon name="grid" className="size-3.5" />
        <Icon name="sliders" className="size-3.5" />
        <div className="mx-2 h-1 flex-1 rounded-full bg-line">
          <div className="h-1 w-1/3 rounded-full bg-accent-soft/70" />
        </div>
      </div>
    </div>
  )
}
