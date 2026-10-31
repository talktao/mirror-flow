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
