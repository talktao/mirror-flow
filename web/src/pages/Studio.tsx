import { CanvasShell } from '../components/canvas/CanvasShell'
import { CapabilityBar } from '../components/canvas/CapabilityBar'
import { ComposerCard } from '../components/canvas/ComposerCard'
import { MiniPreview } from '../components/canvas/MiniPreview'
import { OutputHistory } from '../components/canvas/OutputHistory'
import { IconRail } from '../components/layout/IconRail'
import { TopBar } from '../components/layout/TopBar'
import { NoticeToast } from '../components/ui/NoticeToast'

export default function Studio() {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-canvas text-ink">
      <TopBar />
      <div className="relative flex min-h-0 flex-1">
        <IconRail />
        <CanvasShell>
          <ComposerCard />
          <CapabilityBar />
        </CanvasShell>
      </div>
      <OutputHistory />
      <MiniPreview />
      <NoticeToast />
    </div>
  )
}
