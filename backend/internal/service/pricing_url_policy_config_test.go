package service

import (
	"context"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/stretchr/testify/require"
)

type pricingPolicyConfigurableStub struct {
	policy config.URLAllowlistConfig
}

func (s *pricingPolicyConfigurableStub) ConfigureURLPolicy(policy config.URLAllowlistConfig) {
	s.policy = policy
}

func (s *pricingPolicyConfigurableStub) FetchPricingJSON(context.Context, string) ([]byte, error) {
	return nil, nil
}

func (s *pricingPolicyConfigurableStub) FetchHashText(context.Context, string) (string, error) {
	return "", nil
}

func TestNewPricingServiceConfiguresRemoteURLPolicy(t *testing.T) {
	remote := &pricingPolicyConfigurableStub{}
	cfg := &config.Config{Security: config.SecurityConfig{URLAllowlist: config.URLAllowlistConfig{
		Enabled:           true,
		PricingHosts:      []string{"raw.githubusercontent.com"},
		AllowPrivateHosts: false,
		AllowInsecureHTTP: false,
	}}}

	service := NewPricingService(cfg, remote)
	require.NotNil(t, service)
	require.Equal(t, cfg.Security.URLAllowlist, remote.policy)
}
