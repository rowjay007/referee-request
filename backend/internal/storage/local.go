package storage

import (
	"context"
	"os"
	"path/filepath"
)

type LocalStore struct {
	root string
}

func NewLocalStore(root string) *LocalStore {
	return &LocalStore{root: root}
}

func (s *LocalStore) Save(_ context.Context, input SaveInput) error {
	fullPath := filepath.Join(s.root, filepath.Clean(input.Key))
	parent := filepath.Dir(fullPath)
	if err := os.MkdirAll(parent, 0o750); err != nil {
		return err
	}

	return os.WriteFile(fullPath, input.Body, 0o600)
}
