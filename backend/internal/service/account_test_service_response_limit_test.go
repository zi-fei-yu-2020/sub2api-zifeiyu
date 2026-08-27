package service

import (
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestReadAccountTestResponseBodyUsesResponseClassLimits(t *testing.T) {
	t.Run("success media response uses media limit", func(t *testing.T) {
		resp := &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(strings.NewReader(strings.Repeat("x", int(accountTestJSONResponseMaxBytes+1)))),
		}
		body, err := readAccountTestResponseBody(resp, accountTestMediaResponseMaxBytes)
		require.NoError(t, err)
		require.Len(t, body, int(accountTestJSONResponseMaxBytes+1))
	})

	t.Run("error response stays on small diagnostic limit", func(t *testing.T) {
		resp := &http.Response{
			StatusCode: http.StatusBadGateway,
			Body:       io.NopCloser(strings.NewReader(strings.Repeat("x", int(accountTestErrorResponseMaxBytes+1)))),
		}
		body, err := readAccountTestResponseBody(resp, accountTestMediaResponseMaxBytes)
		require.Nil(t, body)
		require.ErrorIs(t, err, ErrUpstreamResponseBodyTooLarge)
		require.Contains(t, formatAccountTestResponseReadError("upstream error", err), "diagnostic size limit")
	})
}

func TestReadAccountTestResponsePrefixRestoresBody(t *testing.T) {
	const payload = "0123456789"
	resp := &http.Response{
		StatusCode: http.StatusTooManyRequests,
		Body:       io.NopCloser(strings.NewReader(payload)),
	}

	prefix, err := readAccountTestResponsePrefix(resp, 4)
	require.ErrorIs(t, err, ErrUpstreamResponseBodyTooLarge)
	require.Equal(t, "0123", string(prefix))

	restored, readErr := io.ReadAll(resp.Body)
	require.NoError(t, readErr)
	require.Equal(t, payload, string(restored))
}

func TestReadAccountTestResponseBodyPropagatesReadErrors(t *testing.T) {
	expected := errors.New("read failed")
	resp := &http.Response{StatusCode: http.StatusOK, Body: io.NopCloser(errorReader{err: expected})}
	_, err := readAccountTestResponseBody(resp, accountTestJSONResponseMaxBytes)
	require.ErrorIs(t, err, expected)
}

type errorReader struct{ err error }

func (r errorReader) Read([]byte) (int, error) { return 0, r.err }
