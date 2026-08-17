package storage

import "context"

type SaveInput struct {
	Key  string
	Body []byte
}

type Store interface {
	Save(ctx context.Context, input SaveInput) error
}
