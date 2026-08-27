package storage

import (
	"context"
	"errors"
)

var ErrNotFound = errors.New("storage object not found")

type SaveInput struct {
	Key         string
	Body        []byte
	ContentType string
}

type ReadOutput struct {
	Body        []byte
	ContentType string
}

type Store interface {
	Save(ctx context.Context, input SaveInput) error
	Read(ctx context.Context, key string) (*ReadOutput, error)
	Delete(ctx context.Context, key string) error
}
