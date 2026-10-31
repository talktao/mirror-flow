// Package handler 只做 HTTP 编解码与中间件，不承载业务规则。
package handler

import (
	"log/slog"

	"github.com/gin-gonic/gin"

	"mirrorflow/server/internal/config"
	"mirrorflow/server/internal/model"
	"mirrorflow/server/internal/pkg/apierr"
)

type Deps struct {
	Config  config.Config
	Catalog *model.Catalog
	Logger  *slog.Logger
}

type Handler struct {
	cfg     config.Config
	catalog *model.Catalog
	log     *slog.Logger
}

func New(deps Deps) *gin.Engine {
	if deps.Config.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	h := &Handler{cfg: deps.Config, catalog: deps.Catalog, log: deps.Logger}

	r := gin.New()
	r.Use(RequestID(), Recovery(deps.Logger), CORS(deps.Config.CORSOrigins))

	r.GET("/healthz", h.healthz)
	r.GET("/readyz", h.readyz)

	v1 := r.Group("/api/v1")
	{
		v1.GET("/models", h.listModels)
		// P1 接入：创建任务、查询任务、SSE 事件、资产下载。
		v1.POST("/tasks", h.createTaskPlaceholder)
	}

	return r
}

func (h *Handler) createTaskPlaceholder(c *gin.Context) {
	respondError(c, apierr.NotImplemented("P0 骨架：任务创建将在 P1 接入"))
}
