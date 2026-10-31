// Package apierr 定义对外统一错误体，handler 不再手写 HTTP 错误字符串。
package apierr

import "net/http"

type Error struct {
	Status  int    `json:"-"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e *Error) Error() string { return e.Code + ": " + e.Message }

func New(status int, code, message string) *Error {
	return &Error{Status: status, Code: code, Message: message}
}

func InvalidArgument(message string) *Error {
	return New(http.StatusBadRequest, "INVALID_ARGUMENT", message)
}

func NotFound(message string) *Error {
	return New(http.StatusNotFound, "NOT_FOUND", message)
}

func CapabilityUnsupported(message string) *Error {
	return New(http.StatusUnprocessableEntity, "CAPABILITY_UNSUPPORTED", message)
}

// NotImplemented 用于 P0 占位路由：接口存在但业务尚未接入。
func NotImplemented(message string) *Error {
	return New(http.StatusNotImplemented, "NOT_IMPLEMENTED", message)
}

func Internal(message string) *Error {
	return New(http.StatusInternalServerError, "INTERNAL_ERROR", message)
}
