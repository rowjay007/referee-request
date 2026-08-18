package notification

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type EmailMessage struct {
	From    string
	To      string
	Subject string
	HTML    string
}

type Sender interface {
	SendEmail(ctx context.Context, message EmailMessage) (string, error)
}

type ResendSender struct {
	apiKey string
	client *http.Client
}

func NewResendSender(apiKey string) *ResendSender {
	return &ResendSender{
		apiKey: apiKey,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

func (s *ResendSender) SendEmail(ctx context.Context, message EmailMessage) (string, error) {
	if strings.TrimSpace(s.apiKey) == "" {
		return "", errors.New("RESEND_API_KEY is not configured")
	}
	if strings.TrimSpace(message.From) == "" {
		return "", errors.New("email from address is required")
	}
	if strings.TrimSpace(message.To) == "" {
		return "", errors.New("email recipient is required")
	}

	body, err := json.Marshal(map[string]any{
		"from":    message.From,
		"to":      []string{message.To},
		"subject": message.Subject,
		"html":    message.HTML,
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		errorBody, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return "", fmt.Errorf("resend request failed with status %d: %s", resp.StatusCode, strings.TrimSpace(string(errorBody)))
	}

	type resendResponse struct {
		ID string `json:"id"`
	}
	parsed := resendResponse{}
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return "", err
	}
	if strings.TrimSpace(parsed.ID) == "" {
		return "", errors.New("resend did not return message id")
	}
	return parsed.ID, nil
}
