package handler

import (
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

// readyz 只做进程内就绪检查；DB / 队列的探针在 P1 接入。
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

	c.JSON(http.StatusOK, gin.H{
		"status": status,
		"checks": checks,
	})
}
