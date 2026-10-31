package adapter

import (
	"context"

	"mirrorflow/server/internal/model"
)

// MockProvider 用于 P0 联调与 P1 测试：接口真实、行为占位。
type MockProvider struct{}

func NewMockProvider() *MockProvider { return &MockProvider{} }

func (m *MockProvider) Name() string { return "mock" }

func (m *MockProvider) Generate(_ context.Context, req GenerateRequest) (*GenerateResult, error) {
	if req.Capability != model.CapabilityTextToImage {
		return nil, ErrNotImplemented
	}
	return nil, ErrNotImplemented
}
