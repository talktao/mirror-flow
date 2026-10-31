package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) listModels(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"items": h.catalog.List(),
	})
}
