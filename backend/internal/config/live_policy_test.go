package config

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestLiveBillingPolicyDefaultsDisabledAndUnacknowledged(t *testing.T) {
	resetViperWithJWTSecret(t)
	cfg, err := Load()
	require.NoError(t, err)
	require.Equal(t, LiveBillingPolicyDisabled, cfg.Gateway.Live.BillingPolicy)
	require.False(t, cfg.Gateway.Live.BillingPolicyExplicit)
	require.False(t, LiveExplicitFreeEnabled(cfg))
}

func TestLiveBillingPolicyExplicitFreeFromEnvironment(t *testing.T) {
	resetViperWithJWTSecret(t)
	t.Setenv("GATEWAY_LIVE_BILLING_POLICY", " EXPLICIT_FREE ")
	cfg, err := Load()
	require.NoError(t, err)
	require.Equal(t, LiveBillingPolicyExplicitFree, cfg.Gateway.Live.BillingPolicy)
	require.True(t, cfg.Gateway.Live.BillingPolicyExplicit)
	require.True(t, LiveExplicitFreeEnabled(cfg))
}

func TestLiveBillingPolicyExplicitFromConfig(t *testing.T) {
	resetViperWithJWTSecret(t)
	configFile := filepath.Join(t.TempDir(), "config.yaml")
	require.NoError(t, os.WriteFile(configFile, []byte(`gateway:
  live:
    billing_policy: disabled
`), 0o600))
	t.Setenv("CONFIG_FILE", configFile)
	cfg, err := Load()
	require.NoError(t, err)
	require.Equal(t, LiveBillingPolicyDisabled, cfg.Gateway.Live.BillingPolicy)
	require.True(t, cfg.Gateway.Live.BillingPolicyExplicit)
}

func TestLiveBillingPolicyRejectsUnknownValue(t *testing.T) {
	resetViperWithJWTSecret(t)
	t.Setenv("GATEWAY_LIVE_BILLING_POLICY", "duration")
	_, err := Load()
	require.ErrorContains(t, err, "gateway.live.billing_policy must be one of")
}
