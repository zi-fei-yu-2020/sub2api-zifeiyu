package handler

import (
	"errors"
	"fmt"
	"io"
	"net/http"
)

const (
	// OAuth token, user-info, and department responses are expected to be small JSON documents.
	oauthHandlerSuccessResponseMaxBytes int64 = 1 << 20
	// Error bodies only need enough room for the provider's structured error payload.
	oauthHandlerErrorResponseMaxBytes int64 = 256 << 10
)

var errOAuthHandlerResponseTooLarge = errors.New("oauth response body too large")

func readOAuthHandlerResponseBody(resp *http.Response, operation string) ([]byte, error) {
	if resp == nil || resp.Body == nil {
		return nil, fmt.Errorf("read %s response: response body is nil", operation)
	}

	limit := oauthHandlerSuccessResponseMaxBytes
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		limit = oauthHandlerErrorResponseMaxBytes
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, limit+1))
	if err != nil {
		return nil, fmt.Errorf("read %s response: %w", operation, err)
	}
	if int64(len(body)) > limit {
		return nil, fmt.Errorf("%s response exceeded %d-byte limit: %w", operation, limit, errOAuthHandlerResponseTooLarge)
	}
	return body, nil
}
