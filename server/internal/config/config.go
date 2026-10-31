// Package config 负责环境变量加载与强校验。
package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	Env         string
	HTTPAddr    string
	DataDir     string
	CORSOrigins []string
	Version     string
}

// Load 读取环境变量，缺省值只覆盖本地开发场景。
func Load() (Config, error) {
	cfg := Config{
		Env:      getenv("APP_ENV", "development"),
		HTTPAddr: getenv("HTTP_ADDR", ":8080"),
		DataDir:  getenv("DATA_DIR", "data"),
		Version:  getenv("APP_VERSION", "0.1.0-p0"),
		CORSOrigins: split(
			getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"),
		),
	}
	return cfg, cfg.validate()
}

func (c Config) validate() error {
	if c.HTTPAddr == "" {
		return fmt.Errorf("config: HTTP_ADDR 不能为空")
	}
	if c.DataDir == "" {
		return fmt.Errorf("config: DATA_DIR 不能为空")
	}
	switch c.Env {
	case "development", "test", "production":
	default:
		return fmt.Errorf("config: APP_ENV 取值非法: %s", c.Env)
	}
	return nil
}

func (c Config) IsProduction() bool { return c.Env == "production" }

func getenv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func split(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if trimmed := strings.TrimSpace(p); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}
