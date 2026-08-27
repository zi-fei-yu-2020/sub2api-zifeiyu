package admin

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestGetLiveCapabilityIncludesBillingPolicyGate(t *testing.T) {
	gin.SetMode(gin.TestMode)
	tests := []struct {
		name     string
		cfg      *config.Config
		policy   string
		explicit bool
	}{
		{name: "missing policy fails closed", cfg: nil, policy: config.LiveBillingPolicyDisabled},
		{name: "explicit free is reported", cfg: &config.Config{Gateway: config.GatewayConfig{Live: config.GatewayLiveConfig{BillingPolicy: config.LiveBillingPolicyExplicitFree, BillingPolicyExplicit: true}}}, policy: config.LiveBillingPolicyExplicitFree, explicit: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			ctx, _ := gin.CreateTestContext(recorder)
			ctx.Request = httptest.NewRequest("GET", "/api/v1/admin/groups/live-capability", nil)
			(&GroupHandler{cfg: tt.cfg}).GetLiveCapability(ctx)
			require.Equal(t, 200, recorder.Code)
			var payload struct {
				Data struct {
					Supported             bool   `json:"supported"`
					AttestationSupported  bool   `json:"attestation_supported"`
					BillingPolicy         string `json:"billing_policy"`
					BillingPolicyExplicit bool   `json:"billing_policy_explicit"`
					Reason                string `json:"reason"`
				} `json:"data"`
			}
			require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
			require.Equal(t, tt.policy, payload.Data.BillingPolicy)
			require.Equal(t, tt.explicit, payload.Data.BillingPolicyExplicit)
			if tt.policy == config.LiveBillingPolicyDisabled {
				require.False(t, payload.Data.Supported)
				require.Contains(t, payload.Data.Reason, "explicit_free")
			}
		})
	}
}
