package store

import (
	"context"
	"errors"

	"mirrorflow/server/internal/model"
)

// ErrNotFound 是持久层「查无此记录」的哨兵错误。
//
// Go 的惯用法：底层返回可比较的 error 变量，上层用 errors.Is(err, store.ErrNotFound)
// 判断，而不是比较字符串。这样换实现、加包装都不会失效。
var ErrNotFound = errors.New("store: 记录不存在")

// CanvasStore 声明画布持久化能力。
//
// 这里用 interface（接口）而不是直接依赖具体 SQLite 类型：
// service 只认这组方法，测试时可以换成内存实现，未来换 MySQL 也不用改上层。
// 每个方法第一个参数都是 context.Context，用于传递超时、取消信号与请求链路信息。
type CanvasStore interface {
	Ping(ctx context.Context) error

	ListCanvases(ctx context.Context) ([]model.Canvas, error)
	CreateCanvas(ctx context.Context, canvas *model.Canvas) error
	GetCanvas(ctx context.Context, canvasID string) (*model.Canvas, error)
	UpdateCanvas(ctx context.Context, canvas *model.Canvas) error
	DeleteCanvas(ctx context.Context, canvasID string) error
}
