package storage

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

type SupabaseStore struct {
	baseURL        string
	bucket         string
	serviceRoleKey string
	client         *http.Client
}

func NewSupabaseStore(baseURL, bucket, serviceRoleKey string, client *http.Client) *SupabaseStore {
	if client == nil {
		client = http.DefaultClient
	}
	return &SupabaseStore{
		baseURL:        strings.TrimRight(baseURL, "/"),
		bucket:         bucket,
		serviceRoleKey: serviceRoleKey,
		client:         client,
	}
}

func (s *SupabaseStore) Save(ctx context.Context, input SaveInput) error {
	request, err := s.newRequest(ctx, http.MethodPost, input.Key, bytes.NewReader(input.Body))
	if err != nil {
		return err
	}
	request.Header.Set("Content-Type", input.ContentType)
	request.Header.Set("x-upsert", "false")
	return s.execute(request, http.StatusOK, http.StatusCreated)
}

func (s *SupabaseStore) Read(ctx context.Context, key string) (*ReadOutput, error) {
	request, err := s.newRequest(ctx, http.MethodGet, key, nil)
	if err != nil {
		return nil, err
	}
	response, err := s.client.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode == http.StatusNotFound {
		return nil, ErrNotFound
	}
	if response.StatusCode != http.StatusOK {
		return nil, responseError(response)
	}
	body, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}
	return &ReadOutput{Body: body, ContentType: response.Header.Get("Content-Type")}, nil
}

func (s *SupabaseStore) Delete(ctx context.Context, key string) error {
	request, err := s.newRequest(ctx, http.MethodDelete, key, nil)
	if err != nil {
		return err
	}
	return s.execute(request, http.StatusOK, http.StatusNoContent, http.StatusNotFound)
}

func (s *SupabaseStore) newRequest(ctx context.Context, method, key string, body io.Reader) (*http.Request, error) {
	objectURL := s.baseURL + "/storage/v1/object/" + url.PathEscape(s.bucket) + "/" + escapeObjectKey(key)
	request, err := http.NewRequestWithContext(ctx, method, objectURL, body)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Authorization", "Bearer "+s.serviceRoleKey)
	request.Header.Set("apikey", s.serviceRoleKey)
	return request, nil
}

func (s *SupabaseStore) execute(request *http.Request, expected ...int) error {
	response, err := s.client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	for _, status := range expected {
		if response.StatusCode == status {
			_, _ = io.Copy(io.Discard, response.Body)
			return nil
		}
	}
	return responseError(response)
}

func responseError(response *http.Response) error {
	body, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
	return fmt.Errorf("supabase storage returned %d: %s", response.StatusCode, strings.TrimSpace(string(body)))
}

func escapeObjectKey(key string) string {
	parts := strings.Split(key, "/")
	for index, part := range parts {
		parts[index] = url.PathEscape(part)
	}
	return strings.Join(parts, "/")
}
