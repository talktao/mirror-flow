package task

import (
	"context"
	"sync"
)

// MemQueue 是单实例内存队列：消息只是「该干活了」的提示，丢失可从 DB 重建。
type MemQueue struct {
	ch     chan Message
	mu     sync.RWMutex
	closed bool
}

func NewMemQueue(capacity int) *MemQueue {
	if capacity <= 0 {
		capacity = 1024
	}
	return &MemQueue{ch: make(chan Message, capacity)}
}

func (q *MemQueue) Enqueue(ctx context.Context, taskID string) error {
	if taskID == "" {
		return nil
	}
	select {
	case q.ch <- Message{TaskID: taskID}:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (q *MemQueue) Dequeue(ctx context.Context) (Message, bool) {
	select {
	case msg := <-q.ch:
		return msg, true
	case <-ctx.Done():
		return Message{}, false
	}
}

func (q *MemQueue) Len() int { return len(q.ch) }

func (q *MemQueue) Close() error {
	q.mu.Lock()
	defer q.mu.Unlock()
	if !q.closed {
		q.closed = true
		close(q.ch)
	}
	return nil
}
