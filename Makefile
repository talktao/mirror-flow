# Mirror Flow 常用命令
# 本机 Go 装在 ~/go/sdk，若已在 PATH 中则直接使用
GO := $(shell command -v go 2>/dev/null || echo $(HOME)/go/sdk/go/bin/go)

.PHONY: dev dev-web dev-server build test lint smoke tidy fmt

## 同时启动前端(:5173)与后端(:8080)
dev:
	@trap 'kill 0' INT TERM EXIT; \
	$(MAKE) dev-server & \
	$(MAKE) dev-web & \
	wait

dev-web:
	cd web && npm run dev

dev-server:
	cd server && $(GO) run ./cmd/server

## 生产构建：前端 dist + 后端 bin/server
build:
	cd web && npm run build
	cd server && $(GO) build -o ../bin/server ./cmd/server

test:
	cd server && $(GO) test ./...

lint:
	cd server && $(GO) vet ./...
	cd web && npm run lint

fmt:
	cd server && $(GO) fmt ./...

tidy:
	cd server && $(GO) mod tidy

## 联调冒烟：健康检查 + 模型目录
smoke:
	@curl -sS http://127.0.0.1:8080/healthz; echo
	@curl -sS http://127.0.0.1:8080/readyz; echo
	@curl -sS http://127.0.0.1:8080/api/v1/models; echo
