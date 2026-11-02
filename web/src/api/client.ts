import type { ErrorBody, HealthInfo, ModelList } from '../types'

export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api/v1'

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly requestId?: string

  constructor(code: string, message: string, status: number, requestId?: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.requestId = requestId
  }
}

/** 唯一允许 fetch 的地方：统一 JSON 解析与 {code, message, request_id} 错误归一。 */
export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const { headers, ...rest } = init ?? {}
  const res = await fetch(url, {
    ...rest,
    headers: { Accept: 'application/json', ...headers },
  })
  const text = await res.text()
  const body = text ? (JSON.parse(text) as unknown) : null

  if (!res.ok) {
    const err = body as ErrorBody | null
    throw new ApiError(
      err?.code ?? 'NETWORK_ERROR',
      err?.message ?? `请求失败（HTTP ${res.status}）`,
      res.status,
      err?.request_id,
    )
  }
  return body as T
}

export const api = {
  health: () => request<HealthInfo>('/healthz'),
  models: () => request<ModelList>(`${API_BASE}/models`),
}
