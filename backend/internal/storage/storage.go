package storage

import "context"

type SaveInput struct {
	Key  string
	Body []byte
}

type ReadOutput struct {
	Body []byte
}

type Store interface {
	Save(ctx context.Context, input SaveInput) error
	Read(ctx context.Context, key string) (*ReadOutput, error)
}
