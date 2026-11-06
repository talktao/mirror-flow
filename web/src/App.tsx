import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useCanvases } from './hooks/useCanvases';
import Canvases from './pages/Canvases';
import Studio from './pages/Studio';

/**
 * 路由约定：
 * /画布管理（首页）
 * /canvas/:canvasId 无限画布
 */
export default function App() {
  // 画布列表在应用层拉一次，两个路由共享同一份 store。
  useCanvases();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Canvases />} />
        <Route path="/canvas/:canvasId" element={<Studio />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
