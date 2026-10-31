// Package configs 只负责把随二进制分发的静态配置文件暴露出来。
package configs

import _ "embed"

// ModelsYAML 是 models.yaml 的原始内容，由 model.NewCatalog 解析。
//go:embed models.yaml
var ModelsYAML []byte
