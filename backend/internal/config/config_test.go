package config

import (
	"strings"
	"testing"
)

func setRequiredEnvironment(t *testing.T) {
	t.Helper()
	t.Setenv("DATABASE_URL", "postgres://example")
	t.Setenv("JWT_SECRET", "test-secret")
	t.Setenv("APP_ENV", "development")
	t.Setenv("STORAGE_PROVIDER", "local")
}

func TestLoadRejectsLocalStorageInProduction(t *testing.T) {
	setRequiredEnvironment(t)
	t.Setenv("APP_ENV", "production")
	_, err := Load()
	if err == nil || !strings.Contains(err.Error(), "supabase in production") {
		t.Fatalf("error = %v", err)
	}
}

func TestLoadValidatesSupabaseStorageSecrets(t *testing.T) {
	setRequiredEnvironment(t)
	t.Setenv("STORAGE_PROVIDER", "supabase")
	t.Setenv("SUPABASE_URL", "https://project.supabase.co")
	t.Setenv("SUPABASE_SERVICE_ROLE_KEY", "")
	_, err := Load()
	if err == nil || !strings.Contains(err.Error(), "SUPABASE_SERVICE_ROLE_KEY") {
		t.Fatalf("error = %v", err)
	}
}

func TestLoadAcceptsSupabaseStorage(t *testing.T) {
	setRequiredEnvironment(t)
	t.Setenv("STORAGE_PROVIDER", "supabase")
	t.Setenv("SUPABASE_URL", "https://project.supabase.co")
	t.Setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role")
	t.Setenv("STORAGE_SUPABASE_BUCKET", "private-documents")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if cfg.StorageSupabaseBucket != "private-documents" {
		t.Fatalf("bucket = %q", cfg.StorageSupabaseBucket)
	}
}

func TestLoadUsesRenderPortWhenAppPortIsUnset(t *testing.T) {
	setRequiredEnvironment(t)
	t.Setenv("PORT", "10000")
	t.Setenv("APP_PORT", "")
	cfg, err := Load()
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if cfg.Port != "10000" {
		t.Fatalf("port = %q, want 10000", cfg.Port)
	}
}
