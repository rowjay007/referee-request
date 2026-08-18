package httpapi

import (
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rowjay007/referee-request/backend/internal/config"
	"github.com/rowjay007/referee-request/backend/internal/httpapi/handlers"
	authmiddleware "github.com/rowjay007/referee-request/backend/internal/httpapi/middleware"
	"github.com/rowjay007/referee-request/backend/internal/notification"
	"github.com/rowjay007/referee-request/backend/internal/storage"
	"github.com/rowjay007/referee-request/backend/internal/store"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

func NewServer(cfg *config.Config, logger *slog.Logger, db *pgxpool.Pool) (http.Handler, error) {
	router := chi.NewRouter()
	router.Use(middleware.RequestID)
	router.Use(middleware.RealIP)
	router.Use(middleware.Recoverer)
	router.Use(middleware.Timeout(15 * time.Second))
	router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))
	router.Use(requestLogMiddleware(logger))

	userStore := store.NewUserStore(db)
	requestStore := store.NewReferenceRequestStore(db)
	documentStorage := storage.NewLocalStore(cfg.StorageLocalRoot)
	notificationSender := notification.NewResendSender(cfg.ResendAPIKey)
	notificationService, err := notification.NewService(logger, requestStore, notificationSender, cfg.ResendFromEmail)
	if err != nil {
		return nil, err
	}
	authHandler := handlers.NewAuthHandler(cfg, userStore)
	requestHandler := handlers.NewReferenceRequestHandler(cfg, requestStore)
	documentHandler := handlers.NewDocumentHandler(cfg, requestStore, documentStorage)
	refereeHandler := handlers.NewRefereeHandler(cfg, requestStore, documentStorage)
	notificationHandler := handlers.NewNotificationHandler(cfg, notificationService)
	if cfg.DispatchToken == "" {
		return nil, errors.New("NOTIFICATION_DISPATCH_TOKEN is required")
	}

	router.Get("/health", handlers.Health)

	router.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", handlers.Health)
		r.Route("/auth", func(authRouter chi.Router) {
			authRouter.Use(httprate.LimitByIP(10, time.Minute))
			authRouter.Post("/signup", authHandler.Signup)
			authRouter.Post("/login", authHandler.Login)
		})

		r.Route("/requests", func(requestRouter chi.Router) {
			requestRouter.Use(authmiddleware.RequireCandidateAuth(cfg.JWTSecret))
			requestRouter.Use(httprate.LimitByIP(60, time.Minute))

			requestRouter.Get("/", requestHandler.List)
			requestRouter.Post("/", requestHandler.Create)
			requestRouter.Get("/{requestId}", requestHandler.Get)
			requestRouter.Post("/{requestId}/send", requestHandler.Send)
			requestRouter.Get("/{requestId}/documents", documentHandler.List)
			requestRouter.Post("/{requestId}/documents", documentHandler.Upload)
		})

		r.Route("/referee", func(refereeRouter chi.Router) {
			refereeRouter.Use(httprate.LimitByIP(30, time.Minute))
			refereeRouter.Get("/{token}", refereeHandler.GetRequest)
			refereeRouter.Get("/{token}/documents/{documentId}", refereeHandler.DownloadDocument)
			refereeRouter.Post("/{token}/submit", refereeHandler.SubmitReference)
		})

		r.Route("/internal/notifications", func(notificationRouter chi.Router) {
			notificationRouter.Use(httprate.LimitByIP(20, time.Minute))
			notificationRouter.Post("/dispatch", notificationHandler.Dispatch)
			notificationRouter.Post("/reminders", notificationHandler.QueueReminders)
		})
	})

	return otelhttp.NewHandler(router, "http.server"), nil
}

func requestLogMiddleware(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
			started := time.Now()
			next.ServeHTTP(ww, r)

			logger.Info(
				"http request",
				"request_id", middleware.GetReqID(r.Context()),
				"method", r.Method,
				"path", r.URL.Path,
				"status", ww.Status(),
				"bytes", ww.BytesWritten(),
				"duration_ms", time.Since(started).Milliseconds(),
			)
		})
	}
}
