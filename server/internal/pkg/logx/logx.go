// Package logx 统一日志构造，开发用文本、生产用 JSON。
package logx

import (
	"log/slog"
	"os"
)

func New(env, version string) *slog.Logger {
	opts := &slog.HandlerOptions{Level: slog.LevelInfo}

	var handler slog.Handler
	if env == "production" {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		handler = slog.NewTextHandler(os.Stdout, opts)
	}

	return slog.New(handler).With("env", env, "version", version)
}
