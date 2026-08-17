package httpapi

import (
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
	"github.com/rowjay007/referee-request/backend/internal/store"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

func NewServer(cfg *config.Config, logger *slog.Logger, db *pgxpool.Pool) http.Handler {
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
	authHandler := handlers.NewAuthHandler(cfg, userStore)

	router.Get("/health", handlers.Health)

	router.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", handlers.Health)
		r.Route("/auth", func(authRouter chi.Router) {
			authRouter.Use(httprate.LimitByIP(10, time.Minute))
			authRouter.Post("/signup", authHandler.Signup)
			authRouter.Post("/login", authHandler.Login)
		})
	})

	return otelhttp.NewHandler(router, "http.server")
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
