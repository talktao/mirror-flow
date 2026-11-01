package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"mirrorflow/server/configs"
	"mirrorflow/server/internal/config"
	"mirrorflow/server/internal/handler"
	"mirrorflow/server/internal/model"
	"mirrorflow/server/internal/pkg/logx"
	"mirrorflow/server/internal/service"
	"mirrorflow/server/internal/store"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("加载配置失败", "err", err)
		os.Exit(1)
	}

	log := logx.New(cfg.Env, cfg.Version)

	catalog, err := model.NewCatalog(configs.ModelsYAML)
	if err != nil {
		log.Error("加载模型目录失败", "err", err)
		os.Exit(1)
	}

	// SQLite 是画布/任务的持久事实源；OpenSQLite 内部会按文件名顺序执行迁移。
	db, err := store.OpenSQLite(context.Background(), cfg.DBPath())
	if err != nil {
		log.Error("初始化数据库失败", "err", err, "path", cfg.DBPath())
		os.Exit(1)
	}
	defer db.Close()

	canvasService := service.NewCanvasService(db)

	// P1 装配顺序：
	// store(sqlite) → adapter.Registry(zhipu/mock) → task.MemQueue
	// → task.Manager(worker 池) → sse.Hub → handler.New
	router := handler.New(handler.Deps{
		Config:  cfg,
		Catalog: catalog,
		Logger:  log,
		Store:   db,
		Canvas:  canvasService,
	})

	srv := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		log.Info("api 已启动", "addr", cfg.HTTPAddr, "models", len(catalog.Models), "db", cfg.DBPath())
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("http 服务异常退出", "err", err)
			stop()
		}
	}()

	<-ctx.Done()
	log.Info("收到退出信号，开始优雅关闭")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error("优雅关闭失败", "err", err)
	}
}
