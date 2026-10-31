// Package task 负责任务的入队、认领与恢复；P0 只提供接口与内存实现。
package task

import "context"

type Message struct {
	TaskID string
}

// Enqueuer 是 service 唯一依赖的接口，避免 service 认识具体队列。
type Enqueuer interface {
	Enqueue(ctx context.Context, taskID string) error
}

// Queue 是队列的完整能力。
type Queue interface {
	Enqueuer
	Dequeue(ctx context.Context) (Message, bool)
	Len() int
	Close() error
}
