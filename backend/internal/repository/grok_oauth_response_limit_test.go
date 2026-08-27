package repository

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

type grokOAuthLimitRoundTripper func(*http.Request) (*http.Response, error)

func (f grokOAuthLimitRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func TestCreateGrokPasswordSessionRejectsOversizedResponse(t *testing.T) {
	client := &http.Client{Transport: grokOAuthLimitRoundTripper(func(*http.Request) (*http.Response, error) {
		return &http.Response{
			StatusCode: http.StatusOK,
			Header:     make(http.Header),
			Body:       io.NopCloser(strings.NewReader(strings.Repeat("x", int(grokOAuthResponseMaxBytes+1)))),
		}, nil
	})}

	_, err := createGrokPasswordSession(context.Background(), client, "user@example.com", "secret", "captcha")
	require.ErrorContains(t, err, "password login response")
	require.ErrorContains(t, err, "response body too large")
}
