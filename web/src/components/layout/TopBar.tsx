import { useHealth, type ConnState } from '../../hooks/useHealth'
import { useUiStore } from '../../stores/ui'
import { Icon } from '../ui/Icon'

const CONN_TEXT: Record<ConnState, string> = {
  checking: '连接中',
  online: '服务已连接',
  offline: '服务离线',
}

const CONN_DOT: Record<ConnState, string> = {
  checking: 'bg-zinc-500',
  online: 'bg-emerald-400',
  offline: 'bg-rose-500',
}

export function TopBar() {
  const { state, info } = useHealth()
  const showNotice = useUiStore((s) => s.showNotice)

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b border-line-soft bg-canvas/80 px-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-accent to-accent-soft text-white shadow-[0_0_18px_rgba(139,92,246,0.35)]">
          <Icon name="cat" className="size-[18px]" strokeWidth={1.8} />
        </div>
        <span className="mr-2 text-[15px] font-semibold tracking-wide">Mirror Flow</span>

        <button
          type="button"
          onClick={() => showNotice('P0 骨架：项目切换尚未接入')}
          className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-left transition-colors hover:border-accent/50"
        >
          <div className="leading-tight">
            <div className="text-[12.5px] text-ink">第一张画布</div>
            <div className="text-[10.5px] text-muted">画布 1</div>
          </div>
          <Icon name="chevron-down" className="size-3.5 text-muted" />
        </button>

        <button
          type="button"
          onClick={() => showNotice('P0 骨架：新建画布尚未接入')}
          className="hidden items-center gap-1 rounded-lg bg-accent/15 px-2.5 py-1.5 text-[12px] font-medium text-accent-soft transition-colors hover:bg-accent/25 sm:flex"
        >
          <Icon name="plus" className="size-3.5" />
          画布
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] text-muted"
          title={info ? `版本 ${info.version}` : undefined}
        >
          <span className={`size-1.5 rounded-full ${CONN_DOT[state]}`} />
          {CONN_TEXT[state]}
        </span>

        <button
          type="button"
          onClick={() => showNotice('P0 骨架：项目监控面板尚未接入')}
          className="hidden items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[12px] text-zinc-300 transition-colors hover:border-accent/50 hover:text-ink sm:flex"
        >
          <Icon name="monitor" className="size-3.5" />
          项目监控
        </button>

        <button
          type="button"
          onClick={() => showNotice('P0 骨架：API 配置面板尚未接入')}
          className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[12px] text-zinc-300 transition-colors hover:border-accent/50 hover:text-ink"
        >
          <Icon name="sliders" className="size-3.5" />
          配置 API
        </button>
      </div>
    </header>
  )
}
