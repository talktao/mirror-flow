import { useEffect } from 'react'
import { useUiStore } from '../../stores/ui'

/** 统一的占位提示条：P0 只做提示，不触发任何业务动作 */
export function NoticeToast() {
  const notice = useUiStore((s) => s.notice)
  const clearNotice = useUiStore((s) => s.clearNotice)

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(clearNotice, 4000)
    return () => window.clearTimeout(timer)
  }, [notice, clearNotice])

  if (!notice) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 z-40 flex justify-center">
      <div className="animate-[fade-in_0.18s_ease-out] rounded-lg border border-accent/30 bg-surface/95 px-3.5 py-2 text-[12px] text-zinc-200 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur">
        {notice}
      </div>
    </div>
  )
}
