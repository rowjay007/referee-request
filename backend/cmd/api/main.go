package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rowjay007/referee-request/backend/internal/config"
	"github.com/rowjay007/referee-request/backend/internal/database"
	"github.com/rowjay007/referee-request/backend/internal/httpapi"
	"github.com/rowjay007/referee-request/backend/internal/notification"
	"github.com/rowjay007/referee-request/backend/internal/store"
	"github.com/rowjay007/referee-request/backend/internal/telemetry"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	shutdownTelemetry, err := telemetry.Setup(cfg)
	if err != nil {
		logger.Error("telemetry setup failed", "error", err)
		os.Exit(1)
	}
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = shutdownTelemetry(ctx)
	}()

	dbPool, err := database.Connect(context.Background(), cfg.DatabaseURL)
	if err != nil {
		logger.Error("database connection failed", "error", err)
		os.Exit(1)
	}
	defer dbPool.Close()

	handler, err := httpapi.NewServer(cfg, logger, dbPool)
	if err != nil {
		logger.Error("server setup failed", "error", err)
		os.Exit(1)
	}

	var notificationWorkerCancel context.CancelFunc
	if cfg.NotificationWorkerEnabled {
		notificationStore := store.NewReferenceRequestStore(dbPool)
		notificationSender := notification.NewResendSender(cfg.ResendAPIKey)
		notificationService, err := notification.NewService(logger, notificationStore, notificationSender, cfg.ResendFromEmail)
		if err != nil {
			logger.Error("notification service setup failed", "error", err)
			os.Exit(1)
		}

		worker := notification.NewWorker(
			logger,
			notificationService,
			cfg.ReminderLeadHours,
			cfg.NotificationDispatchInterval,
			cfg.NotificationReminderInterval,
			cfg.NotificationDispatchBatchLimit,
		)

		var workerCtx context.Context
		workerCtx, notificationWorkerCancel = context.WithCancel(context.Background())
		go worker.Run(workerCtx)
	} else {
		logger.Info("notification worker disabled", "env", cfg.Environment)
	}

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		logger.Info("api starting", "port", cfg.Port, "env", cfg.Environment)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	if notificationWorkerCancel != nil {
		notificationWorkerCancel()
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		logger.Error("server shutdown failed", "error", err)
	}
}
