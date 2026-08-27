package storage

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
)

type LocalStore struct {
	root string
}

func NewLocalStore(root string) *LocalStore {
	return &LocalStore{root: root}
}

func (s *LocalStore) Save(_ context.Context, input SaveInput) error {
	fullPath, err := s.resolvePath(input.Key)
	if err != nil {
		return err
	}
	parent := filepath.Dir(fullPath)
	if err := os.MkdirAll(parent, 0o750); err != nil {
		return err
	}

	return os.WriteFile(fullPath, input.Body, 0o600)
}

func (s *LocalStore) Read(_ context.Context, key string) (*ReadOutput, error) {
	fullPath, err := s.resolvePath(key)
	if err != nil {
		return nil, err
	}

	body, err := os.ReadFile(fullPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &ReadOutput{Body: body}, nil
}

func (s *LocalStore) Delete(_ context.Context, key string) error {
	fullPath, err := s.resolvePath(key)
	if err != nil {
		return err
	}
	if err := os.Remove(fullPath); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}

func (s *LocalStore) resolvePath(key string) (string, error) {
	cleanKey := filepath.Clean(key)
	if cleanKey == "." || strings.HasPrefix(cleanKey, "..") || filepath.IsAbs(cleanKey) {
		return "", errors.New("invalid storage key")
	}

	fullPath := filepath.Join(s.root, cleanKey)
	rootClean := filepath.Clean(s.root)
	if !strings.HasPrefix(fullPath, rootClean) {
		return "", errors.New("invalid storage key")
	}
	return fullPath, nil
}
