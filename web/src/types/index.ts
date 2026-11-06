/** 与后端契约对齐的类型定义（P0 只有健康检查与模型目录） */

export type Capability =
  | 'text_to_image'
  | 'image_to_image'
  | 'text_to_video'
  | 'image_to_video'
  | 'video_to_video'

export interface ModelInfo {
  id: string
  provider: string
  display_name: string
  capability: Capability
  enabled: boolean
  note?: string
}

export interface ModelList {
  items: ModelInfo[]
}

export interface HealthInfo {
  status: 'ok'
  version: string
  time: string
}

/** 后端统一错误体 */
export interface ErrorBody {
  code: string
  message: string
  request_id?: string
}

/** 画布（项目）元数据，字段与后端 model.Canvas 的 json tag 对齐 */
export interface Canvas {
  id: string
  name: string
  description: string
  created_at: number
  updated_at: number
}

export interface CanvasList {
  items: Canvas[]
}

export interface CanvasItem {
  item: Canvas
}

/** 创建/更新画布的请求体 */
export interface CanvasInput {
  name: string
  description: string
}

/** 任务状态与后端 model.Status 对齐 */
export type TaskStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled'

/** 任务与后端 model.Task 的 json tag 对齐（snake_case） */
export interface Task {
  id: string
  canvas_id: string
  capability: Capability
  model_id: string
  provider: string
  status: TaskStatus
  phase: string
  progress: number
  est_progress: number
  progress_note: string
  prompt: string
  negative_prompt: string
  params_json: string
  input_asset_ids: string
  idempotency_key?: string
  provider_job_id: string
  result_json?: string
  error_code: string
  error_msg: string
  cost_micros: number
  attempt: number
  cancel_requested: boolean
  worker_id: string
  next_run_at: number
  timeout_at: number
  created_at: number
  updated_at: number
  started_at: number
  finished_at: number
}

/** 平台资产：前端只使用资产接口，不接触厂商临时 URL */
export interface Asset {
  id: string
  task_id: string
  role: string
  kind: string
  storage_key: string
  mime_type: string
  size_bytes: number
  width: number
  height: number
  duration_ms: number
  sha256: string
  source_url: string
  created_at: number
}

export interface TaskItem {
  item: Task
  created: boolean
}

export interface TaskDetail {
  item: Task
  assets: Asset[]
}

export interface TaskList {
  items: Task[]
}

/** 创建任务请求体，与方案 §9 对齐 */
export interface CreateTaskInput {
  canvas_id: string
  capability: Capability
  model: string
  prompt: string
  negative_prompt?: string
  inputs?: string[]
  params?: Record<string, unknown>
  idempotency_key?: string
}
