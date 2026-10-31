// Package id 生成 UUIDv7，保证按时间有序、便于索引。
package id

import "github.com/google/uuid"

func New() string {
	return uuid.Must(uuid.NewV7()).String()
}
