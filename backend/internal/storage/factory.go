package storage

import (
	"fmt"
	"net/http"
)

type Config struct {
	Provider       string
	LocalRoot      string
	SupabaseURL    string
	SupabaseBucket string
	ServiceRoleKey string
}

func New(cfg Config, client *http.Client) (Store, error) {
	switch cfg.Provider {
	case "local":
		return NewLocalStore(cfg.LocalRoot), nil
	case "supabase":
		return NewSupabaseStore(cfg.SupabaseURL, cfg.SupabaseBucket, cfg.ServiceRoleKey, client), nil
	default:
		return nil, fmt.Errorf("unsupported storage provider %q", cfg.Provider)
	}
}
