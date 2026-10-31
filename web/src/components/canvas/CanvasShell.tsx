import type { ReactNode } from 'react'

/** 无限画布的可视区域：点阵背景 + 居中内容槽 */
export function CanvasShell({ children }: { children: ReactNode }) {
  return (
    <main className="canvas-grid relative flex-1 overflow-hidden">
      <div className="glow-accent pointer-events-none absolute inset-0" />
      <div className="relative flex h-full flex-col items-center justify-center gap-4 px-4 pb-16">
        {children}
      </div>
    </main>
  )
}
