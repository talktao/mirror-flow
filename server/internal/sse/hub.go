// Package sse 维护进程内订阅关系；SSE 只是加速器，轮询始终是兜底。
package sse

import (
	"sync"
)

type Event struct {
	ID   int64
	Type string
	Data []byte
}

type Subscriber struct {
	TaskID string
	C      chan Event
}

type Hub struct {
	mu   sync.RWMutex
	subs map[string]map[*Subscriber]struct{}
}

func NewHub() *Hub {
	return &Hub{subs: make(map[string]map[*Subscriber]struct{})}
}

func (h *Hub) Subscribe(taskID string) *Subscriber {
	sub := &Subscriber{TaskID: taskID, C: make(chan Event, 16)}
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.subs[taskID] == nil {
		h.subs[taskID] = make(map[*Subscriber]struct{})
	}
	h.subs[taskID][sub] = struct{}{}
	return sub
}

func (h *Hub) Unsubscribe(sub *Subscriber) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if set, ok := h.subs[sub.TaskID]; ok {
		delete(set, sub)
		if len(set) == 0 {
			delete(h.subs, sub.TaskID)
		}
	}
	close(sub.C)
}

// Publish 非阻塞推送；订阅者消费不过来时直接丢弃，由客户端断线回放兜底。
func (h *Hub) Publish(taskID string, event Event) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for sub := range h.subs[taskID] {
		select {
		case sub.C <- event:
		default:
		}
	}
}
