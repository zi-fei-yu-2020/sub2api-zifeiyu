package repository

import (
	"net/http"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/stretchr/testify/require"
)

func TestHTTPUpstreamValidateRequestHostPrivateNetwork(t *testing.T) {
	svc := &httpUpstreamService{cfg: &config.Config{Security: config.SecurityConfig{
		URLAllowlist: config.URLAllowlistConfig{
			Enabled:           true,
			UpstreamHosts:     []string{"127.0.0.1:11434"},
			AllowPrivateHosts: true,
			AllowInsecureHTTP: true,
		},
	}}}
	req, err := http.NewRequest(http.MethodGet, "http://127.0.0.1:11434/v1/models", nil)
	require.NoError(t, err)
	require.NoError(t, svc.validateRequestHost(req))
}

func TestHTTPUpstreamValidateRequestHostRejectsMetadataInPrivateNetwork(t *testing.T) {
	svc := &httpUpstreamService{cfg: &config.Config{Security: config.SecurityConfig{
		URLAllowlist: config.URLAllowlistConfig{
			Enabled:           true,
			UpstreamHosts:     []string{"169.254.169.254"},
			AllowPrivateHosts: true,
			AllowInsecureHTTP: true,
		},
	}}}
	req, err := http.NewRequest(http.MethodGet, "http://169.254.169.254/latest/meta-data", nil)
	require.NoError(t, err)
	require.Error(t, svc.validateRequestHost(req))
}

func TestHTTPUpstreamRedirectCheckerRejectsHostOutsideAllowlist(t *testing.T) {
	svc := &httpUpstreamService{cfg: &config.Config{Security: config.SecurityConfig{
		URLAllowlist: config.URLAllowlistConfig{
			Enabled:       true,
			UpstreamHosts: []string{"api.openai.com"},
		},
	}}}
	req, err := http.NewRequest(http.MethodGet, "https://redirected.example.net/v1", nil)
	require.NoError(t, err)
	require.Error(t, svc.redirectChecker(req, nil))
}
