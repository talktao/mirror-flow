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
