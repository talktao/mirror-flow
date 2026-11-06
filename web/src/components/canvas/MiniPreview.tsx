import { taskApi } from '../../api/tasks'
import { useActiveTask } from '../../hooks/useActiveTask'
import { TASK_STATUS_TEXT } from '../../lib/taskStatus'
import { Icon } from '../ui/Icon'

/** 右下角预览：有结果时显示当前任务产物。 */
export function MiniPreview({ canvasId }: { canvasId: string }) {
  const { task, output } = useActiveTask(canvasId)

  return (
    <div className="absolute right-4 bottom-4 z-30 hidden w-[180px] overflow-hidden rounded-xl border border-line bg-surface/90 shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur md:block">
      <div className="flex h-[104px] items-center justify-center overflow-hidden bg-surface-2/60">
        {output ? (
          <img src={taskApi.assetUrl(output.id)} alt={task?.prompt ?? '生成结果'} className="h-full w-full object-cover" />
        ) : (
          <span className="text-[11px] text-faint">暂无预览</span>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-line-soft px-2.5 py-1.5 text-muted">
        <Icon name="grid" className="size-3.5 shrink-0" />
        <span className="flex-1 truncate text-center text-[10.5px]">
          {task ? TASK_STATUS_TEXT[task.status] : '画布预览'}
        </span>
        <Icon name="sliders" className="size-3.5 shrink-0" />
      </div>
    </div>
  )
}
