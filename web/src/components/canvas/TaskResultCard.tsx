import { taskApi } from '../../api/tasks'
import { useActiveTask } from '../../hooks/useActiveTask'
import { TASK_STATUS_TEXT } from '../../lib/taskStatus'
import type { TaskStatus } from '../../types'

const STATUS_TONE: Record<TaskStatus, string> = {
  queued: 'bg-white/8 text-muted',
  running: 'bg-accent/15 text-accent-soft',
  succeeded: 'bg-accent/15 text-accent-soft',
  failed: 'bg-white/8 text-ink',
  canceled: 'bg-white/8 text-muted',
}

/** 画布中央的结果节点：展示状态与平台资产，不伪造百分比进度。 */
export function TaskResultCard({ canvasId }: { canvasId: string }) {
  const { task, output } = useActiveTask(canvasId)
  if (!task) return null

  const isPending = task.status === 'queued' || task.status === 'running'

  return (
    <section className="w-full max-w-[600px] rounded-2xl border border-line bg-surface/95 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur">
      <header className="flex items-center gap-2">
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_TONE[task.status]}`}
        >
          {TASK_STATUS_TEXT[task.status]}
        </span>
        <span className="truncate text-[12px] text-muted">{task.prompt}</span>
      </header>

      {isPending && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-line-soft bg-white/[0.03] px-3 py-4 text-[11.5px] text-muted">
          <span className="size-2 animate-pulse rounded-full bg-accent-soft" />
          {task.status === 'queued' ? '已排队，等待执行' : '生成中，结果会自动出现'}
        </div>
      )}

      {task.status === 'failed' && (
        <p className="mt-3 rounded-lg border border-line-soft bg-white/[0.03] px-3 py-3 text-[11.5px] leading-5 text-ink">
          {task.error_msg || '生成失败，请重试'}
        </p>
      )}

      {task.status === 'canceled' && (
        <p className="mt-3 text-[11.5px] text-muted">任务已取消</p>
      )}

      {task.status === 'succeeded' && output && (
        <img
          src={taskApi.assetUrl(output.id)}
          alt={task.prompt}
          className="mt-3 max-h-[220px] w-full rounded-lg border border-line-soft object-cover"
        />
      )}

      {task.status === 'succeeded' && !output && (
        <p className="mt-3 text-[11.5px] text-muted">任务已完成，结果同步中…</p>
      )}
    </section>
  )
}
