package config

import (
	"errors"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Environment                    string
	Port                           string
	BaseURL                        string
	FrontendBaseURL                string
	SupabaseURL                    string
	SupabaseAnonKey                string
	DatabaseURL                    string
	JWTSecret                      string
	JWTTTLMin                      int
	OTELExporter                   string
	CORSAllowedOrigins             []string
	StorageProvider                string
	StorageLocalRoot               string
	UploadMaxBytes                 int64
	ResendAPIKey                   string
	ResendFromEmail                string
	ReminderLeadHours              int
	DispatchToken                  string
	NotificationWorkerEnabled      bool
	NotificationDispatchInterval   time.Duration
	NotificationReminderInterval   time.Duration
	NotificationDispatchBatchLimit int
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	cfg := &Config{
		Environment:        getEnv("APP_ENV", "development"),
		Port:               getEnv("APP_PORT", "8080"),
		BaseURL:            getEnv("APP_BASE_URL", "http://localhost:8080"),
		FrontendBaseURL:    getEnv("FRONTEND_BASE_URL", "http://localhost:3000"),
		SupabaseURL:        getEnv("SUPABASE_URL", ""),
		SupabaseAnonKey:    getEnv("SUPABASE_ANON_KEY", ""),
		DatabaseURL:        os.Getenv("DATABASE_URL"),
		JWTSecret:          os.Getenv("JWT_SECRET"),
		OTELExporter:       getEnv("OTEL_EXPORTER", "stdout"),
		CORSAllowedOrigins: splitCSV(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000")),
		StorageProvider:    getEnv("STORAGE_PROVIDER", "local"),
		StorageLocalRoot:   getEnv("STORAGE_LOCAL_ROOT", "./tmp/storage"),
		ResendAPIKey:       getEnv("RESEND_API_KEY", ""),
		ResendFromEmail:    getEnv("RESEND_FROM_EMAIL", "onboarding@resend.dev"),
		DispatchToken:      getEnv("NOTIFICATION_DISPATCH_TOKEN", "dev-notification-dispatch-token"),
	}

	ttl := getEnv("JWT_TTL_MINUTES", "60")
	ttlMin, err := strconv.Atoi(ttl)
	if err != nil || ttlMin <= 0 {
		return nil, errors.New("JWT_TTL_MINUTES must be a positive integer")
	}
	cfg.JWTTTLMin = ttlMin

	uploadLimit := getEnv("UPLOAD_MAX_BYTES", "10485760")
	uploadMaxBytes, err := strconv.ParseInt(uploadLimit, 10, 64)
	if err != nil || uploadMaxBytes <= 0 {
		return nil, errors.New("UPLOAD_MAX_BYTES must be a positive integer")
	}
	cfg.UploadMaxBytes = uploadMaxBytes

	reminderLeadHours := getEnv("REMINDER_LEAD_HOURS", "72")
	leadHours, err := strconv.Atoi(reminderLeadHours)
	if err != nil || leadHours <= 0 {
		return nil, errors.New("REMINDER_LEAD_HOURS must be a positive integer")
	}
	cfg.ReminderLeadHours = leadHours

	enabledDefault := cfg.Environment == "production"
	enabledRaw := getEnv("NOTIFICATION_WORKER_ENABLED", strconv.FormatBool(enabledDefault))
	enabled, err := strconv.ParseBool(enabledRaw)
	if err != nil {
		return nil, errors.New("NOTIFICATION_WORKER_ENABLED must be true or false")
	}
	cfg.NotificationWorkerEnabled = enabled

	dispatchIntervalRaw := getEnv("NOTIFICATION_DISPATCH_INTERVAL", "45s")
	dispatchInterval, err := time.ParseDuration(dispatchIntervalRaw)
	if err != nil || dispatchInterval <= 0 {
		return nil, errors.New("NOTIFICATION_DISPATCH_INTERVAL must be a positive duration (for example 30s or 1m)")
	}
	cfg.NotificationDispatchInterval = dispatchInterval

	reminderIntervalRaw := getEnv("NOTIFICATION_REMINDER_INTERVAL", "30m")
	reminderInterval, err := time.ParseDuration(reminderIntervalRaw)
	if err != nil || reminderInterval <= 0 {
		return nil, errors.New("NOTIFICATION_REMINDER_INTERVAL must be a positive duration (for example 15m or 1h)")
	}
	cfg.NotificationReminderInterval = reminderInterval

	batchLimitRaw := getEnv("NOTIFICATION_DISPATCH_BATCH_LIMIT", "50")
	batchLimit, err := strconv.Atoi(batchLimitRaw)
	if err != nil || batchLimit <= 0 || batchLimit > 200 {
		return nil, errors.New("NOTIFICATION_DISPATCH_BATCH_LIMIT must be between 1 and 200")
	}
	cfg.NotificationDispatchBatchLimit = batchLimit

	if cfg.DatabaseURL == "" {
		return nil, errors.New("DATABASE_URL is required")
	}
	if cfg.JWTSecret == "" {
		return nil, errors.New("JWT_SECRET is required")
	}
	if cfg.StorageProvider != "local" {
		return nil, errors.New("STORAGE_PROVIDER must be local")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	trimmed := make([]string, 0, len(parts))
	for _, part := range parts {
		p := strings.TrimSpace(part)
		if p != "" {
			trimmed = append(trimmed, p)
		}
	}
	return trimmed
}
