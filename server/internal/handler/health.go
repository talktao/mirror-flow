package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func (h *Handler) healthz(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"version": h.cfg.Version,
		"time":    time.Now().UTC().Format(time.RFC3339),
	})
}

// readyz 做进程内就绪检查：配置、模型目录、数据库连接。
// context.WithTimeout 限制探测耗时，避免数据库卡住时把探针一起拖死。
func (h *Handler) readyz(c *gin.Context) {
	checks := gin.H{
		"config":  "ok",
		"catalog": "ok",
	}
	status := "ok"

	if len(h.catalog.Models) == 0 {
		checks["catalog"] = "empty"
		status = "degraded"
	}

	if h.store != nil {
		pingCtx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()
		if err := h.store.Ping(pingCtx); err != nil {
			checks["database"] = "down"
			status = "degraded"
		} else {
			checks["database"] = "ok"
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status": status,
		"checks": checks,
	})
}
