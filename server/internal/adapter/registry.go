package adapter

import (
	"fmt"
	"sync"
)

// Provider 是 sync / async 两种形态的公共标识。
type Provider interface {
	Name() string
}

type Registry struct {
	mu  sync.RWMutex
	all map[string]Provider
}

func NewRegistry() *Registry {
	return &Registry{all: make(map[string]Provider)}
}

func (r *Registry) Register(p Provider) {
	if p == nil || p.Name() == "" {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.all[p.Name()] = p
}

func (r *Registry) Get(name string) (Provider, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	p, ok := r.all[name]
	if !ok {
		return nil, fmt.Errorf("adapter: 未注册的 provider: %s", name)
	}
	return p, nil
}
