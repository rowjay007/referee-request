package config

import (
	"errors"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Environment        string
	Port               string
	BaseURL            string
	DatabaseURL        string
	JWTSecret          string
	JWTTTLMin          int
	OTELExporter       string
	CORSAllowedOrigins []string
	StorageProvider    string
	StorageLocalRoot   string
	UploadMaxBytes     int64
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	cfg := &Config{
		Environment:        getEnv("APP_ENV", "development"),
		Port:               getEnv("APP_PORT", "8080"),
		BaseURL:            getEnv("APP_BASE_URL", "http://localhost:8080"),
		DatabaseURL:        os.Getenv("DATABASE_URL"),
		JWTSecret:          os.Getenv("JWT_SECRET"),
		OTELExporter:       getEnv("OTEL_EXPORTER", "stdout"),
		CORSAllowedOrigins: splitCSV(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000")),
		StorageProvider:    getEnv("STORAGE_PROVIDER", "local"),
		StorageLocalRoot:   getEnv("STORAGE_LOCAL_ROOT", "./tmp/storage"),
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
