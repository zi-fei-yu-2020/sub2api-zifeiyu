package service

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"net/http"
)

const (
	// Diagnostic error bodies only need enough room for structured upstream errors.
	accountTestErrorResponseMaxBytes int64 = 256 << 10
	// Normal non-streaming probe responses are small JSON documents.
	accountTestJSONResponseMaxBytes int64 = 4 << 20
	// Image, audio, and video previews may contain base64 or binary media.
	accountTestMediaResponseMaxBytes int64 = 64 << 20
)

func readAccountTestResponseBody(resp *http.Response, successLimit int64) ([]byte, error) {
	if resp == nil || resp.Body == nil {
		return nil, errors.New("upstream response body is nil")
	}
	limit := successLimit
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		limit = accountTestErrorResponseMaxBytes
	}
	if limit <= 0 {
		limit = accountTestJSONResponseMaxBytes
	}
	return readUpstreamResponseBodyLimited(resp.Body, limit)
}

func formatAccountTestResponseReadError(kind string, err error) string {
	if errors.Is(err, ErrUpstreamResponseBodyTooLarge) {
		return fmt.Sprintf("%s response exceeded the diagnostic size limit", kind)
	}
	return fmt.Sprintf("Failed to read %s response: %s", kind, err.Error())
}

// readAccountTestResponsePrefix preserves the original response stream for its
// caller. It is used only for best-effort classification before the caller
// performs the authoritative bounded read.
func readAccountTestResponsePrefix(resp *http.Response, maxBytes int64) ([]byte, error) {
	if resp == nil || resp.Body == nil {
		return nil, errors.New("upstream response body is nil")
	}
	if maxBytes <= 0 {
		maxBytes = accountTestErrorResponseMaxBytes
	}
	original := resp.Body
	prefix, err := io.ReadAll(io.LimitReader(original, maxBytes+1))
	resp.Body = struct {
		io.Reader
		io.Closer
	}{Reader: io.MultiReader(bytes.NewReader(prefix), original), Closer: original}
	if err != nil {
		return nil, err
	}
	if int64(len(prefix)) > maxBytes {
		return prefix[:maxBytes], fmt.Errorf("%w: limit=%d", ErrUpstreamResponseBodyTooLarge, maxBytes)
	}
	return prefix, nil
}
