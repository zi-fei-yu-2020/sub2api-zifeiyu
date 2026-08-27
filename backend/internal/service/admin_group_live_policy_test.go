package service

import (
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"github.com/stretchr/testify/require"
)

func explicitFreeLiveConfigForTest() *config.Config {
	return &config.Config{Gateway: config.GatewayConfig{Live: config.GatewayLiveConfig{
		BillingPolicy:         config.LiveBillingPolicyExplicitFree,
		BillingPolicyExplicit: true,
	}}}
}

func TestAdminGroupLivePolicyRequiresExplicitFree(t *testing.T) {
	tests := []struct {
		name      string
		cfg       *config.Config
		allowLive bool
		wantCode  string
	}{
		{name: "disabled by default", cfg: &config.Config{}, allowLive: true, wantCode: "LIVE_BILLING_POLICY_DISABLED"},
		{name: "nil config fails closed", cfg: nil, allowLive: true, wantCode: "LIVE_BILLING_POLICY_DISABLED"},
		{name: "explicit free permits enablement", cfg: &config.Config{Gateway: config.GatewayConfig{Live: config.GatewayLiveConfig{BillingPolicy: config.LiveBillingPolicyExplicitFree, BillingPolicyExplicit: true}}}, allowLive: true},
		{name: "disabling remains allowed", cfg: nil, allowLive: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := &adminServiceImpl{cfg: tt.cfg}
			err := svc.validateLiveGroupPolicy(tt.allowLive)
			if tt.wantCode == "" {
				require.NoError(t, err)
				return
			}
			require.Error(t, err)
			var appErr *infraerrors.ApplicationError
			require.ErrorAs(t, err, &appErr)
			require.Equal(t, tt.wantCode, appErr.Reason)
		})
	}
}
