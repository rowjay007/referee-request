package store

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrUserNotFound = errors.New("user not found")
var ErrEmailExists = errors.New("email already exists")

type User struct {
	ID           uuid.UUID
	Email        string
	FullName     string
	PasswordHash string
	CreatedAt    time.Time
}

type UserStore struct {
	db *pgxpool.Pool
}

func NewUserStore(db *pgxpool.Pool) *UserStore {
	return &UserStore{db: db}
}

func (s *UserStore) CreateUser(ctx context.Context, email, fullName, passwordHash string) (*User, error) {
	const query = `
		INSERT INTO users (email, full_name, password_hash)
		VALUES ($1, $2, $3)
		RETURNING id, email, full_name, password_hash, created_at
	`

	user := &User{}
	err := s.db.QueryRow(ctx, query, email, fullName, passwordHash).Scan(
		&user.ID,
		&user.Email,
		&user.FullName,
		&user.PasswordHash,
		&user.CreatedAt,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, ErrEmailExists
		}
		return nil, err
	}
	return user, nil
}

func (s *UserStore) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	const query = `
		SELECT id, email, full_name, password_hash, created_at
		FROM users
		WHERE email = $1
		LIMIT 1
	`
	user := &User{}
	err := s.db.QueryRow(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.FullName,
		&user.PasswordHash,
		&user.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (s *UserStore) UpsertOAuthUser(ctx context.Context, email, fullName, placeholderPasswordHash string) (*User, error) {
	cleanFullName := strings.TrimSpace(fullName)
	if cleanFullName == "" {
		cleanFullName = strings.Split(email, "@")[0]
	}

	const query = `
		INSERT INTO users (email, full_name, password_hash)
		VALUES ($1, $2, $3)
		ON CONFLICT (email) DO UPDATE
		SET full_name = EXCLUDED.full_name,
			updated_at = NOW()
		RETURNING id, email, full_name, password_hash, created_at
	`

	user := &User{}
	err := s.db.QueryRow(ctx, query, email, cleanFullName, placeholderPasswordHash).Scan(
		&user.ID,
		&user.Email,
		&user.FullName,
		&user.PasswordHash,
		&user.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return user, nil
}
