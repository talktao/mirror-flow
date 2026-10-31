// Package storage 负责把厂商临时 URL 转存为平台长期资产。
package storage

import (
	"context"
	"errors"
	"io"
)

var ErrNotImplemented = errors.New("storage: P0 只定义契约，未实现落盘")

type Storage interface {
	// Put 返回平台可访问的相对路径（storage_key）。
	Put(ctx context.Context, key string, body io.Reader, contentType string) (string, error)
	Delete(ctx context.Context, key string) error
}
