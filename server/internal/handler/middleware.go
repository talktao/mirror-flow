package handler

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	"mirrorflow/server/internal/pkg/apierr"
	"mirrorflow/server/internal/pkg/id"
)

const requestIDKey = "request_id"

func requestID(c *gin.Context) string {
	if v, ok := c.Get(requestIDKey); ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

// RequestID 保证每个请求可追踪，响应头与错误体都带上同一个 id。
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		rid := c.GetHeader("X-Request-ID")
		if rid == "" {
			rid = id.New()
		}
		c.Set(requestIDKey, rid)
		c.Header("X-Request-ID", rid)
		c.Next()
	}
}

func Recovery(log *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Error("panic recovered",
					"err", rec,
					"path", c.Request.URL.Path,
					"request_id", requestID(c),
				)
				respondError(c, apierr.Internal("服务内部错误"))
			}
		}()
		c.Next()
	}
}

func CORS(origins []string) gin.HandlerFunc {
	allowed := make(map[string]struct{}, len(origins))
	for _, o := range origins {
		allowed[o] = struct{}{}
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if _, ok := allowed[origin]; ok && origin != "" {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID, Last-Event-ID")
			c.Header("Access-Control-Max-Age", "600")
		}
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
