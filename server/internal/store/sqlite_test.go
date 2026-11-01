package store

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"

	"mirrorflow/server/internal/model"
)

// TestSQLiteCanvasCRUD 用临时目录跑一遍真实 SQLite，覆盖迁移与五个 CRUD 方法。
// t.TempDir() 会在测试结束后自动清理，不会污染 server/data。
func TestSQLiteCanvasCRUD(t *testing.T) {
	ctx := context.Background()
	s, err := OpenSQLite(ctx, filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("打开数据库失败: %v", err)
	}
	defer s.Close()

	now := time.Now().UTC().UnixMilli()
	item := &model.Canvas{
		ID:        "cv-test-1",
		Name:      "测试画布",
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.CreateCanvas(ctx, item); err != nil {
		t.Fatalf("创建画布失败: %v", err)
	}

	items, err := s.ListCanvases(ctx)
	if err != nil {
		t.Fatalf("查询列表失败: %v", err)
	}
	if len(items) != 1 || items[0].Name != "测试画布" {
		t.Fatalf("列表结果不符合预期: %+v", items)
	}

	item.Name = "改名后的画布"
	if err := s.UpdateCanvas(ctx, item); err != nil {
		t.Fatalf("更新画布失败: %v", err)
	}

	got, err := s.GetCanvas(ctx, item.ID)
	if err != nil {
		t.Fatalf("查询单条失败: %v", err)
	}
	if got.Name != "改名后的画布" {
		t.Fatalf("更新未生效: %+v", got)
	}

	if err := s.DeleteCanvas(ctx, item.ID); err != nil {
		t.Fatalf("删除画布失败: %v", err)
	}

	_, err = s.GetCanvas(ctx, item.ID)
	if !errors.Is(err, ErrNotFound) {
		t.Fatalf("删除后期望 ErrNotFound，实际: %v", err)
	}
}
