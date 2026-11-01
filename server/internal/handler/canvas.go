package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"mirrorflow/server/internal/pkg/apierr"
)

// createCanvasRequest 是创建/更新画布的请求 DTO。
//
// 请求结构体和数据库实体分开：前端不能通过 JSON 直接改 id / created_at，
// 只有 json tag 里的字段会被 ShouldBindJSON 填充。
type createCanvasRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type updateCanvasRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (h *Handler) listCanvases(c *gin.Context) {
	// c.Request.Context() 拿到标准库 context，请求断开或超时时会向上游传递取消信号。
	items, err := h.canvasService.List(c.Request.Context())
	if err != nil {
		h.log.Error("查询画布列表失败", "err", err, "request_id", requestID(c))
		respondError(c, apierr.Internal("查询画布列表失败"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) getCanvas(c *gin.Context) {
	// Param("id") 对应路由里的 /canvases/:id。
	item, err := h.canvasService.Get(c.Request.Context(), c.Param("id"))
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"item": item})
}

func (h *Handler) createCanvas(c *gin.Context) {
	var req createCanvasRequest
	// ShouldBindJSON 按 json tag 解码请求体；BindJSON 出错时还会自动写 400，这里要自己控制错误体。
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, apierr.InvalidArgument("请求体不是合法的 JSON"))
		return
	}

	item, err := h.canvasService.Create(c.Request.Context(), req.Name, req.Description)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"item": item})
}

func (h *Handler) updateCanvas(c *gin.Context) {
	var req updateCanvasRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondError(c, apierr.InvalidArgument("请求体不是合法的 JSON"))
		return
	}

	item, err := h.canvasService.Update(c.Request.Context(), c.Param("id"), req.Name, req.Description)
	if err != nil {
		respondError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"item": item})
}

func (h *Handler) deleteCanvas(c *gin.Context) {
	if err := h.canvasService.Delete(c.Request.Context(), c.Param("id")); err != nil {
		respondError(c, err)
		return
	}
	// 204 表示成功且没有响应体，前端 axios/fetch 不需要解析 body。
	c.Status(http.StatusNoContent)
}
