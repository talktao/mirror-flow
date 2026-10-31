// Package model 定义跨层共享的领域类型与常量，不含任何 I/O。
package model

// Capability 是产品能力的稳定标识，直接对外暴露。
type Capability string

const (
	CapabilityTextToImage  Capability = "text_to_image"
	CapabilityImageToImage Capability = "image_to_image"
	CapabilityTextToVideo  Capability = "text_to_video"
	CapabilityImageToVideo Capability = "image_to_video"
	CapabilityVideoToVideo Capability = "video_to_video"
)

// SupportedCapabilities 是本批真正启用的能力集合（P2 起逐项放开）。
var SupportedCapabilities = []Capability{CapabilityTextToImage}

func (c Capability) Supported() bool {
	for _, item := range SupportedCapabilities {
		if item == c {
			return true
		}
	}
	return false
}

// Status 是任务业务语义状态。
type Status string

const (
	StatusQueued    Status = "queued"
	StatusRunning   Status = "running"
	StatusSucceeded Status = "succeeded"
	StatusFailed    Status = "failed"
	StatusCanceled  Status = "canceled"
)

// Phase 是执行阶段，与 Status 拆开才能区分「running 但尚未提交」与「running 正在轮询」。
type Phase string

const (
	PhaseSubmit   Phase = "submit"
	PhasePoll     Phase = "poll"
	PhaseSync     Phase = "sync"
	PhaseDownload Phase = "download"
)

// Task 与 tasks 表一一对应；JSON 字段只用于跨层传递，不直接作为对外 DTO。
type Task struct {
	ID              string     `json:"id"`
	UserID          *string    `json:"user_id,omitempty"`
	Capability      Capability `json:"capability"`
	ModelID         string     `json:"model_id"`
	Provider        string     `json:"provider"`
	Status          Status     `json:"status"`
	Phase           Phase      `json:"phase"`
	Progress        int        `json:"progress"`
	EstProgress     int        `json:"est_progress"`
	ProgressNote    string     `json:"progress_note"`
	Prompt          string     `json:"prompt"`
	NegativePrompt  string     `json:"negative_prompt"`
	ParamsJSON      string     `json:"params_json"`
	InputAssetIDs   string     `json:"input_asset_ids"`
	IdempotencyKey  *string    `json:"idempotency_key,omitempty"`
	ProviderJobID   string     `json:"provider_job_id"`
	ResultJSON      *string    `json:"result_json,omitempty"`
	ErrorCode       string     `json:"error_code"`
	ErrorMsg        string     `json:"error_msg"`
	CostMicros      int64      `json:"cost_micros"`
	Attempt         int        `json:"attempt"`
	CancelRequested bool       `json:"cancel_requested"`
	WorkerID        string     `json:"worker_id"`
	NextRunAt       int64      `json:"next_run_at"`
	TimeoutAt       int64      `json:"timeout_at"`
	CreatedAt       int64      `json:"created_at"`
	UpdatedAt       int64      `json:"updated_at"`
	StartedAt       int64      `json:"started_at"`
	FinishedAt      int64      `json:"finished_at"`
}

// Asset 与 assets 表一一对应：厂商 URL 只留在 SourceURL 供审计，展示一律走平台资产。
type Asset struct {
	ID         string `json:"id"`
	TaskID     string `json:"task_id"`
	Role       string `json:"role"`
	Kind       string `json:"kind"`
	StorageKey string `json:"storage_key"`
	MimeType   string `json:"mime_type"`
	SizeBytes  int64  `json:"size_bytes"`
	Width      int    `json:"width"`
	Height     int    `json:"height"`
	DurationMS int    `json:"duration_ms"`
	SHA256     string `json:"sha256"`
	SourceURL  string `json:"source_url"`
	CreatedAt  int64  `json:"created_at"`
}

// TaskEvent 是 SSE 回放的最小单元。
type TaskEvent struct {
	ID        int64  `json:"id"`
	TaskID    string `json:"task_id"`
	Type      string `json:"type"`
	Data      string `json:"data"`
	CreatedAt int64  `json:"created_at"`
}
