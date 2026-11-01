package model

// Canvas 是「画布 / 项目」的元数据，与 canvases 表一一对应。
//
// 反引号里的 `json:"id"` 是 struct tag：encoding/json 在序列化时
// 会把 Go 字段 ID 变成 JSON 里的 "id"。前端 types 里的字段名要和它保持一致。
type Canvas struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	CreatedAt   int64  `json:"created_at"`
	UpdatedAt   int64  `json:"updated_at"`
}
