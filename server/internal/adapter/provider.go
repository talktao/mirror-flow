// Package adapter 是厂商差异的唯一落脚点；其余层不认识具体厂商名。
package adapter

import (
	"context"
	"errors"

	"mirrorflow/server/internal/model"
)

var ErrNotImplemented = errors.New("adapter: P0 只定义契约，未实现厂商调用")

// GenerateRequest 是上层传给适配器的统一入参。
type GenerateRequest struct {
	TaskID        string
	Capability    model.Capability
	ModelID       string
	Prompt        string
	NegativePrompt string
	ParamsJSON    string
	InputAssetIDs []string
}

// AssetRef 是厂商返回的原始产物，必须由 storage 转存后才能落库。
type AssetRef struct {
	Role      string
	Kind      string
	SourceURL string
	MimeType  string
}

type GenerateResult struct {
	Assets        []AssetRef
	ProviderJobID string
	CostMicros    int64
}

// SyncProvider 一次请求出结果，例如图片模型。
type SyncProvider interface {
	Name() string
	Generate(ctx context.Context, req GenerateRequest) (*GenerateResult, error)
}

// AsyncProvider 提交 + 轮询，例如视频模型。
type AsyncProvider interface {
	Name() string
	Submit(ctx context.Context, req GenerateRequest) (providerJobID string, err error)
	Poll(ctx context.Context, providerJobID string) (*GenerateResult, error)
}
