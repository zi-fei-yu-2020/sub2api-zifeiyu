package service

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestRedeemCodeExpiry(t *testing.T) {
	now := time.Now().UTC()
	past := now.Add(-time.Hour)
	future := now.Add(time.Hour)

	usedBy := int64(42)
	usedAt := now.Add(-time.Minute)

	tests := []struct {
		name        string
		code        RedeemCode
		wantExpired bool
		wantCanUse  bool
	}{
		{
			name:        "unused without expiry can be used",
			code:        RedeemCode{Status: StatusUnused},
			wantExpired: false,
			wantCanUse:  true,
		},
		{
			name:        "unused before expiry can be used",
			code:        RedeemCode{Status: StatusUnused, ExpiresAt: &future},
			wantExpired: false,
			wantCanUse:  true,
		},
		{
			name:        "unused after expiry cannot be used",
			code:        RedeemCode{Status: StatusUnused, ExpiresAt: &past},
			wantExpired: true,
			wantCanUse:  false,
		},
		{
			name:        "explicit expired status is expired",
			code:        RedeemCode{Status: StatusExpired},
			wantExpired: true,
			wantCanUse:  false,
		},
		{
			name:        "unused with used by marker cannot be used",
			code:        RedeemCode{Status: StatusUnused, UsedBy: &usedBy},
			wantExpired: false,
			wantCanUse:  false,
		},
		{
			name:        "unused with used at marker cannot be used",
			code:        RedeemCode{Status: StatusUnused, UsedAt: &usedAt},
			wantExpired: false,
			wantCanUse:  false,
		},
		{
			name:        "used code remains used even after expiry time",
			code:        RedeemCode{Status: StatusUsed, ExpiresAt: &past},
			wantExpired: false,
			wantCanUse:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.wantExpired, tt.code.IsExpiredAt(now))
			require.Equal(t, tt.wantCanUse, tt.code.CanUse())
		})
	}
}

func TestRedeemCodeUsageConsistency(t *testing.T) {
	now := time.Now().UTC()
	userID := int64(7)

	tests := []struct {
		name       string
		code       *RedeemCode
		issue      string
		consistent bool
	}{
		{name: "clean unused", code: &RedeemCode{Status: StatusUnused}},
		{name: "complete used", code: &RedeemCode{Status: StatusUsed, UsedBy: &userID, UsedAt: &now}, consistent: true},
		{name: "unused with marker", code: &RedeemCode{Status: StatusUnused, UsedAt: &now}, issue: RedeemUsageIssueNonUsedHasMarker},
		{name: "used missing time", code: &RedeemCode{Status: StatusUsed, UsedBy: &userID}, issue: RedeemUsageIssueUsedMissingTime},
		{name: "used missing user", code: &RedeemCode{Status: StatusUsed, UsedAt: &now}, issue: RedeemUsageIssueUsedMissingUser},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.issue, tt.code.UsageConsistencyIssue())
			require.Equal(t, tt.consistent, tt.code.IsConsistentlyUsed())
		})
	}
}
