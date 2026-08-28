package repository

import (
	"net/http"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/service"
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

func TestHTTPUpstreamAllowsInitialConfiguredPublicHost(t *testing.T) {
	svc := &httpUpstreamService{cfg: &config.Config{Security: config.SecurityConfig{
		URLAllowlist: config.URLAllowlistConfig{Enabled: true, UpstreamHosts: []string{"api.openai.com"}},
	}}}
	req, err := http.NewRequest(http.MethodGet, "https://8.8.8.8/v1/models", nil)
	require.NoError(t, err)
	req = service.WithHTTPUpstreamConfiguredHost(req)
	require.NoError(t, svc.validateRequestHost(req))
}

func TestHTTPUpstreamConfiguredHostDoesNotAuthorizeCrossHostRedirect(t *testing.T) {
	svc := &httpUpstreamService{cfg: &config.Config{Security: config.SecurityConfig{
		URLAllowlist: config.URLAllowlistConfig{Enabled: true},
	}}}
	initial, err := http.NewRequest(http.MethodGet, "https://8.8.8.8/v1/models", nil)
	require.NoError(t, err)
	initial = service.WithHTTPUpstreamConfiguredHost(initial)
	redirected, err := http.NewRequest(http.MethodGet, "https://1.1.1.1/v1/models", nil)
	require.NoError(t, err)
	redirected = redirected.WithContext(initial.Context())
	require.Error(t, svc.redirectChecker(redirected, []*http.Request{initial}))
}

func TestHTTPUpstreamConfiguredHostDoesNotBypassPrivateAllowlist(t *testing.T) {
	svc := &httpUpstreamService{cfg: &config.Config{Security: config.SecurityConfig{
		URLAllowlist: config.URLAllowlistConfig{
			Enabled: true, AllowPrivateHosts: true, AllowInsecureHTTP: true,
			UpstreamHosts: []string{"10.0.0.1:11434"},
		},
	}}}
	req, err := http.NewRequest(http.MethodGet, "http://127.0.0.1:11434/v1/models", nil)
	require.NoError(t, err)
	req = service.WithHTTPUpstreamConfiguredHost(req)
	require.Error(t, svc.validateRequestHost(req))
}
