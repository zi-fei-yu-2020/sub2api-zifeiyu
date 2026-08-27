package config

import "strings"

const (
	LiveBillingPolicyDisabled     = "disabled"
	LiveBillingPolicyExplicitFree = "explicit_free"
)

// NormalizeLiveBillingPolicy canonicalizes operator input while keeping the
// safe disabled policy as the zero-value behavior.
func NormalizeLiveBillingPolicy(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return LiveBillingPolicyDisabled
	}
	return value
}

// LiveExplicitFreeEnabled reports whether the operator explicitly accepted
// zero-cost OpenAI Live sessions. A nil config always fails closed.
func LiveExplicitFreeEnabled(cfg *Config) bool {
	return cfg != nil &&
		cfg.Gateway.Live.BillingPolicyExplicit &&
		NormalizeLiveBillingPolicy(cfg.Gateway.Live.BillingPolicy) == LiveBillingPolicyExplicitFree
}
