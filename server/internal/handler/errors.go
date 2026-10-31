package handler

import (
	"errors"

	"github.com/gin-gonic/gin"

	"mirrorflow/server/internal/pkg/apierr"
)

// respondError 把所有错误归一到统一错误体：{code, message, request_id}。
func respondError(c *gin.Context, err error) {
	var apiErr *apierr.Error
	if !errors.As(err, &apiErr) {
		apiErr = apierr.Internal("服务内部错误")
	}

	c.AbortWithStatusJSON(apiErr.Status, gin.H{
		"code":       apiErr.Code,
		"message":    apiErr.Message,
		"request_id": requestID(c),
	})
}
