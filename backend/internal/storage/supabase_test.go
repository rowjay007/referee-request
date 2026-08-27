package storage

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSupabaseStoreHTTPBehavior(t *testing.T) {
	var saved []byte
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer service-role" || r.Header.Get("apikey") != "service-role" {
			t.Fatalf("missing service role headers")
		}
		if r.URL.EscapedPath() != "/storage/v1/object/private-bucket/candidate/request/file%20name.pdf" {
			t.Fatalf("escaped path = %q", r.URL.EscapedPath())
		}
		switch r.Method {
		case http.MethodPost:
			if r.Header.Get("Content-Type") != "application/pdf" {
				t.Fatalf("content type = %q", r.Header.Get("Content-Type"))
			}
			saved, _ = io.ReadAll(r.Body)
			w.WriteHeader(http.StatusCreated)
		case http.MethodGet:
			w.Header().Set("Content-Type", "application/pdf")
			_, _ = w.Write(saved)
		case http.MethodDelete:
			w.WriteHeader(http.StatusNoContent)
		default:
			t.Fatalf("unexpected method %s", r.Method)
		}
	}))
	t.Cleanup(server.Close)

	store := NewSupabaseStore(server.URL, "private-bucket", "service-role", server.Client())
	key := "candidate/request/file name.pdf"
	if err := store.Save(context.Background(), SaveInput{Key: key, Body: []byte("pdf"), ContentType: "application/pdf"}); err != nil {
		t.Fatalf("save: %v", err)
	}
	output, err := store.Read(context.Background(), key)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if string(output.Body) != "pdf" || output.ContentType != "application/pdf" {
		t.Fatalf("read output = %#v", output)
	}
	if err := store.Delete(context.Background(), key); err != nil {
		t.Fatalf("delete: %v", err)
	}
}

func TestSupabaseStoreMapsNotFound(t *testing.T) {
	server := httptest.NewServer(http.NotFoundHandler())
	t.Cleanup(server.Close)
	store := NewSupabaseStore(server.URL, "bucket", "key", server.Client())
	if _, err := store.Read(context.Background(), "missing"); err != ErrNotFound {
		t.Fatalf("read error = %v, want %v", err, ErrNotFound)
	}
}
