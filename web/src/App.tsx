import { useCanvases } from './hooks/useCanvases'
import Canvases from './pages/Canvases'
import Studio from './pages/Studio'
import { useUiStore } from './stores/ui'

export default function App() {
  const view = useUiStore((s) => s.view)

  // 画布列表在应用层拉一次，Studio 与画布管理页共享同一份 store。
  useCanvases()

  return view === 'canvases' ? <Canvases /> : <Studio />
}
