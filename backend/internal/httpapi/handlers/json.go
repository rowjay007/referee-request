package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
)

func decodeJSONBody(r *http.Request, target any, maxBytes int64) error {
	r.Body = io.NopCloser(io.LimitReader(r.Body, maxBytes))
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(target); err != nil {
		return err
	}

	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		if err == nil {
			return errors.New("multiple JSON objects are not allowed")
		}
		return err
	}

	return nil
}
