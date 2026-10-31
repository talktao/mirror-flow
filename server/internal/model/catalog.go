package model

import (
	"fmt"

	"gopkg.in/yaml.v3"
)

// ModelInfo 是对外暴露的模型描述，前端据此渲染模型选择器。
type ModelInfo struct {
	ID          string     `json:"id" yaml:"id"`
	Provider    string     `json:"provider" yaml:"provider"`
	DisplayName string     `json:"display_name" yaml:"display_name"`
	Capability  Capability `json:"capability" yaml:"capability"`
	Enabled     bool       `json:"enabled" yaml:"enabled"`
	Note        string     `json:"note,omitempty" yaml:"note"`
}

type Catalog struct {
	Models []ModelInfo
}

type catalogFile struct {
	Models []ModelInfo `yaml:"models"`
}

// NewCatalog 解析 models.yaml 并做最小校验。
func NewCatalog(raw []byte) (*Catalog, error) {
	var file catalogFile
	if err := yaml.Unmarshal(raw, &file); err != nil {
		return nil, fmt.Errorf("model: 解析 models.yaml 失败: %w", err)
	}
	if len(file.Models) == 0 {
		return nil, fmt.Errorf("model: models.yaml 至少需要一个条目")
	}
	seen := make(map[string]struct{}, len(file.Models))
	for i, m := range file.Models {
		if m.ID == "" || m.Provider == "" || m.DisplayName == "" {
			return nil, fmt.Errorf("model: 第 %d 个条目缺少 id/provider/display_name", i+1)
		}
		if !m.Capability.Supported() {
			return nil, fmt.Errorf("model: %s 的能力 %s 不在本批启用集合内", m.ID, m.Capability)
		}
		if _, dup := seen[m.ID]; dup {
			return nil, fmt.Errorf("model: 模型 id 重复: %s", m.ID)
		}
		seen[m.ID] = struct{}{}
	}
	return &Catalog{Models: file.Models}, nil
}

func (c *Catalog) List() []ModelInfo {
	out := make([]ModelInfo, len(c.Models))
	copy(out, c.Models)
	return out
}

func (c *Catalog) Find(id string) (ModelInfo, bool) {
	for _, m := range c.Models {
		if m.ID == id {
			return m, true
		}
	}
	return ModelInfo{}, false
}
