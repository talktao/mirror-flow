// Package store 定义持久化边界。P0 只有接口与迁移脚本，SQLite 实现在 P1 补齐。
package store

import (
	"context"
	"errors"

	"mirrorflow/server/internal/model"
)

var ErrNotImplemented = errors.New("store: P0 尚未实现持久化")

// Store 是任务、事件、资产的唯一事实源访问层。
type Store interface {
	Ping(ctx context.Context) error

	CreateTask(ctx context.Context, task *model.Task) error
	GetTask(ctx context.Context, taskID string) (*model.Task, error)

	AppendEvent(ctx context.Context, event *model.TaskEvent) error
	ListEvents(ctx context.Context, taskID string, afterID int64) ([]model.TaskEvent, error)

	CreateAsset(ctx context.Context, asset *model.Asset) error
	ListAssets(ctx context.Context, taskID string) ([]model.Asset, error)
}
