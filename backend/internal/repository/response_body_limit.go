package repository

import (
	"errors"
	"fmt"
	"io"
)

var errRepositoryResponseBodyTooLarge = errors.New("remote response body too large")

func readRepositoryResponseBody(reader io.Reader, maxBytes int64) ([]byte, error) {
	if reader == nil {
		return nil, errors.New("response body is nil")
	}
	if maxBytes <= 0 {
		return nil, errors.New("response body limit must be positive")
	}
	body, err := io.ReadAll(io.LimitReader(reader, maxBytes+1))
	if err != nil {
		return nil, err
	}
	if int64(len(body)) > maxBytes {
		return nil, fmt.Errorf("%w: limit=%d", errRepositoryResponseBodyTooLarge, maxBytes)
	}
	return body, nil
}
