// Package service 编排创建、取消、重试与状态推进；P0 只有骨架。
package service

import (
	"context"
	"errors"

	"mirrorflow/server/internal/adapter"
	"mirrorflow/server/internal/model"
	"mirrorflow/server/internal/store"
	"mirrorflow/server/internal/task"
)

var ErrNotImplemented = errors.New("service: P0 未实现任务创建")

type CreateTaskInput struct {
	Capability     model.Capability
	ModelID        string
	Prompt         string
	NegativePrompt string
	ParamsJSON     string
	InputAssetIDs  []string
	IdempotencyKey string
}

type TaskService struct {
	store  store.Store
	queue  task.Enqueuer
	models *model.Catalog
	reg    *adapter.Registry
}

func NewTaskService(s store.Store, q task.Enqueuer, models *model.Catalog, reg *adapter.Registry) *TaskService {
	return &TaskService{store: s, queue: q, models: models, reg: reg}
}

// Create 在 P1 落地：校验能力 → 幂等建行 → 入队 → 返回 taskId，全程不阻塞等厂商。
func (s *TaskService) Create(_ context.Context, in CreateTaskInput) (*model.Task, error) {
	if !in.Capability.Supported() {
		return nil, ErrNotImplemented
	}
	if _, ok := s.models.Find(in.ModelID); !ok {
		return nil, ErrNotImplemented
	}
	return nil, ErrNotImplemented
}
