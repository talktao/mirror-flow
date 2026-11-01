// Package service 承载业务规则：参数校验、错误翻译、时间与 id 生成。
package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"mirrorflow/server/internal/model"
	"mirrorflow/server/internal/pkg/apierr"
	"mirrorflow/server/internal/pkg/id"
	"mirrorflow/server/internal/store"
)

const (
	maxCanvasNameRunes = 40
	maxCanvasDescRunes = 200
)

// CanvasService 只依赖 store.CanvasStore 接口，不关心底层是 SQLite 还是内存。
type CanvasService struct {
	store store.CanvasStore
}

func NewCanvasService(s store.CanvasStore) *CanvasService {
	return &CanvasService{store: s}
}

func (s *CanvasService) List(ctx context.Context) ([]model.Canvas, error) {
	items, err := s.store.ListCanvases(ctx)
	if err != nil {
		return nil, fmt.Errorf("查询画布列表失败: %w", err)
	}
	return items, nil
}

func (s *CanvasService) Get(ctx context.Context, canvasID string) (*model.Canvas, error) {
	item, err := s.store.GetCanvas(ctx, canvasID)
	if err != nil {
		return nil, translate(err)
	}
	return item, nil
}

func (s *CanvasService) Create(ctx context.Context, name, description string) (*model.Canvas, error) {
	name, description, err := validateCanvasInput(name, description)
	if err != nil {
		return nil, err
	}

	// time.Now().UTC().UnixMilli() 返回 int64 毫秒，与数据库 BIGINT 对齐。
	now := time.Now().UTC().UnixMilli()
	item := &model.Canvas{
		ID:          id.New(),
		Name:        name,
		Description: description,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.store.CreateCanvas(ctx, item); err != nil {
		return nil, fmt.Errorf("创建画布失败: %w", err)
	}
	return item, nil
}

func (s *CanvasService) Update(ctx context.Context, canvasID, name, description string) (*model.Canvas, error) {
	name, description, err := validateCanvasInput(name, description)
	if err != nil {
		return nil, err
	}

	item, err := s.store.GetCanvas(ctx, canvasID)
	if err != nil {
		return nil, translate(err)
	}

	item.Name = name
	item.Description = description
	item.UpdatedAt = time.Now().UTC().UnixMilli()

	if err := s.store.UpdateCanvas(ctx, item); err != nil {
		return nil, translate(err)
	}
	return item, nil
}

func (s *CanvasService) Delete(ctx context.Context, canvasID string) error {
	if err := s.store.DeleteCanvas(ctx, canvasID); err != nil {
		return translate(err)
	}
	return nil
}

// validateCanvasInput 去掉首尾空格并按「字符数」而不是字节数限制长度。
//
// Go 的 len(string) 返回字节数，中文一个字往往是 3 字节；
// 用 []rune 转成字符切片，len 才是用户看到的字数。
func validateCanvasInput(name, description string) (string, string, error) {
	name = strings.TrimSpace(name)
	description = strings.TrimSpace(description)

	if name == "" {
		return "", "", apierr.InvalidArgument("画布名称不能为空")
	}
	if len([]rune(name)) > maxCanvasNameRunes {
		return "", "", apierr.InvalidArgument(fmt.Sprintf("画布名称不能超过 %d 个字符", maxCanvasNameRunes))
	}
	if len([]rune(description)) > maxCanvasDescRunes {
		return "", "", apierr.InvalidArgument(fmt.Sprintf("画布描述不能超过 %d 个字符", maxCanvasDescRunes))
	}
	return name, description, nil
}

// translate 把持久层的哨兵错误翻译成对外错误体，其余错误交给 handler 归为 500。
func translate(err error) error {
	if errors.Is(err, store.ErrNotFound) {
		return apierr.NotFound("画布不存在")
	}
	return err
}
