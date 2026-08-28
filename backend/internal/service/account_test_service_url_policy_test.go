package service

import (
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/stretchr/testify/require"
)

func TestAccountTestValidateUpstreamBaseURLAllowsPublicCustomHost(t *testing.T) {
	svc := &AccountTestService{cfg: &config.Config{Security: config.SecurityConfig{URLAllowlist: config.URLAllowlistConfig{
		Enabled:       true,
		UpstreamHosts: []string{"api.openai.com"},
	}}}}
	got, err := svc.validateUpstreamBaseURL("https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode")
	require.NoError(t, err)
	require.Equal(t, "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode", got)
}

func TestAccountTestValidateUpstreamBaseURLRejectsPrivateHostInStrictMode(t *testing.T) {
	svc := &AccountTestService{cfg: &config.Config{Security: config.SecurityConfig{URLAllowlist: config.URLAllowlistConfig{
		Enabled:           true,
		AllowInsecureHTTP: true,
		UpstreamHosts:     []string{"127.0.0.1:11434"},
	}}}}
	_, err := svc.validateUpstreamBaseURL("http://127.0.0.1:11434")
	require.Error(t, err)
}

func TestAccountTestValidateUpstreamBaseURLAllowsExplicitPrivateHost(t *testing.T) {
	svc := &AccountTestService{cfg: &config.Config{Security: config.SecurityConfig{URLAllowlist: config.URLAllowlistConfig{
		Enabled:           true,
		AllowPrivateHosts: true,
		AllowInsecureHTTP: true,
		UpstreamHosts:     []string{"127.0.0.1:11434"},
	}}}}
	got, err := svc.validateUpstreamBaseURL("http://127.0.0.1:11434")
	require.NoError(t, err)
	require.Equal(t, "http://127.0.0.1:11434", got)
}
