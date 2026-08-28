package service

import (
	"crypto/rand"
	"encoding/hex"
	"time"
)

type RedeemCode struct {
	ID        int64
	Code      string
	Type      string
	Value     float64
	Status    string
	UsedBy    *int64
	UsedAt    *time.Time
	Notes     string
	CreatedAt time.Time
	ExpiresAt *time.Time

	GroupID      *int64
	ValidityDays int

	User  *User
	Group *Group
}

func (r *RedeemCode) IsUsed() bool {
	return r.Status == StatusUsed
}

const (
	RedeemUsageIssueNonUsedHasMarker = "non_used_has_usage_marker"
	RedeemUsageIssueUsedMissingUser  = "used_missing_user"
	RedeemUsageIssueUsedMissingTime  = "used_missing_time"
)

func (r *RedeemCode) HasUsageMarker() bool {
	return r != nil && (r.UsedBy != nil || r.UsedAt != nil)
}

func (r *RedeemCode) HasCompleteUsageMarker() bool {
	return r != nil && r.UsedBy != nil && r.UsedAt != nil
}

func (r *RedeemCode) UsageConsistencyIssue() string {
	if r == nil {
		return ""
	}
	if r.Status != StatusUsed {
		if r.HasUsageMarker() {
			return RedeemUsageIssueNonUsedHasMarker
		}
		return ""
	}
	if r.UsedAt == nil {
		return RedeemUsageIssueUsedMissingTime
	}
	if r.UsedBy == nil {
		return RedeemUsageIssueUsedMissingUser
	}
	return ""
}

func (r *RedeemCode) IsConsistentlyUsed() bool {
	return r != nil && r.Status == StatusUsed && r.HasCompleteUsageMarker()
}

func (r *RedeemCode) IsExpired() bool {
	return r.IsExpiredAt(time.Now())
}

func (r *RedeemCode) IsExpiredAt(now time.Time) bool {
	if r == nil {
		return false
	}
	if r.Status == StatusExpired {
		return true
	}
	return r.Status == StatusUnused && r.ExpiresAt != nil && !r.ExpiresAt.After(now)
}

func (r *RedeemCode) CanUse() bool {
	return r != nil && r.Status == StatusUnused && !r.HasUsageMarker() && !r.IsExpired()
}

func GenerateRedeemCode() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
