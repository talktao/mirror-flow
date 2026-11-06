import { useState } from 'react'
import { taskApi } from '../api/tasks'
import { useTaskStore } from '../stores/tasks'
import { useUiStore } from '../stores/ui'
import type { CreateTaskInput, Task } from '../types'

/** 提交任务并把当前画布的查看目标切到新任务。 */
export function useCreateTask() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const upsertTask = useTaskStore((s) => s.upsertTask)
  const setActiveTask = useTaskStore((s) => s.setActiveTask)
  const showNotice = useUiStore((s) => s.showNotice)

  const submit = async (input: CreateTaskInput): Promise<Task | null> => {
    setIsSubmitting(true)
    try {
      const { item } = await taskApi.create(input)
      upsertTask(item)
      setActiveTask(input.canvas_id, item.id)
      return item
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误'
      showNotice(`创建任务失败：${message}`)
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  return { submit, isSubmitting }
}
