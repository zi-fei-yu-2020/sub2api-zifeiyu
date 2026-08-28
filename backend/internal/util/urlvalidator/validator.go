package urlvalidator

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type ValidationOptions struct {
	AllowedHosts     []string
	RequireAllowlist bool
	AllowPrivate     bool
}

// ValidateHTTPURL validates an outbound HTTP/HTTPS URL.
//
// It provides a single validation entry point that supports:
// - HTTP/HTTPS scheme enforcement
// - optional host or host:port allowlists, including *.example.com wildcards
// - strict/public and explicitly allowlisted private-network policies
//
// Call ValidateResolvedIPWithOptions immediately before dispatch to validate DNS results.
func ValidateHTTPURL(raw string, allowInsecureHTTP bool, opts ValidationOptions) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", errors.New("url is required")
	}

	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "", fmt.Errorf("invalid url: %s", trimmed)
	}

	scheme := strings.ToLower(parsed.Scheme)
	if scheme != "https" && (!allowInsecureHTTP || scheme != "http") {
		return "", fmt.Errorf("invalid url scheme: %s", parsed.Scheme)
	}

	host := strings.ToLower(strings.TrimSpace(parsed.Hostname()))
	if host == "" {
		return "", errors.New("invalid host")
	}
	if err := validateHostLiteral(host, opts.AllowPrivate); err != nil {
		return "", err
	}

	if port := parsed.Port(); port != "" {
		num, err := strconv.Atoi(port)
		if err != nil || num <= 0 || num > 65535 {
			return "", fmt.Errorf("invalid port: %s", port)
		}
	}

	allowlist := normalizeAllowlist(opts.AllowedHosts)
	if opts.RequireAllowlist && len(allowlist) == 0 {
		return "", errors.New("allowlist is not configured")
	}
	if len(allowlist) > 0 && !isAllowedTarget(host, parsed.Port(), scheme, allowlist) {
		return "", fmt.Errorf("host is not allowed: %s", parsed.Host)
	}

	parsed.Path = strings.TrimRight(parsed.Path, "/")
	parsed.RawPath = ""
	return strings.TrimRight(parsed.String(), "/"), nil
}

// ValidateConfiguredUpstreamURL validates an operator-configured account
// endpoint. Public HTTPS hosts may be configured per account without being
// duplicated in the global allowlist. Private-network targets still require
// both AllowPrivate and an explicit global allowlist entry.
func ValidateConfiguredUpstreamURL(raw string, allowInsecureHTTP bool, opts ValidationOptions) (string, error) {
	publicURL, publicErr := ValidateHTTPURL(raw, allowInsecureHTTP, ValidationOptions{AllowPrivate: false})
	if publicErr == nil {
		return publicURL, nil
	}
	if !opts.AllowPrivate {
		return "", publicErr
	}
	return ValidateHTTPURL(raw, allowInsecureHTTP, ValidationOptions{
		AllowedHosts:     opts.AllowedHosts,
		RequireAllowlist: true,
		AllowPrivate:     true,
	})
}

func ValidateURLFormat(raw string, allowInsecureHTTP bool) (string, error) {
	// Minimal parser used only by compatible and legacy configurations.
	// It intentionally does not enforce host allowlists or private-address policy.
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", errors.New("url is required")
	}

	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "", fmt.Errorf("invalid url: %s", trimmed)
	}

	scheme := strings.ToLower(parsed.Scheme)
	if scheme != "https" && (!allowInsecureHTTP || scheme != "http") {
		return "", fmt.Errorf("invalid url scheme: %s", parsed.Scheme)
	}

	host := strings.TrimSpace(parsed.Hostname())
	if host == "" {
		return "", errors.New("invalid host")
	}

	if port := parsed.Port(); port != "" {
		num, err := strconv.Atoi(port)
		if err != nil || num <= 0 || num > 65535 {
			return "", fmt.Errorf("invalid port: %s", port)
		}
	}

	return strings.TrimRight(trimmed, "/"), nil
}

func ValidateHTTPSURL(raw string, opts ValidationOptions) (string, error) {
	return ValidateHTTPURL(raw, false, opts)
}

// ValidateResolvedIP validates DNS results using the strict public-network policy.
func ValidateResolvedIP(host string) error {
	return ValidateResolvedIPWithOptions(host, false)
}

// ValidateResolvedIPWithOptions validates every resolved address. Private-network
// mode may use loopback/RFC1918 targets, but link-local, multicast, unspecified,
// and known cloud metadata endpoints remain blocked in every profile.
func ValidateResolvedIPWithOptions(host string, allowPrivate bool) error {
	host = strings.ToLower(strings.TrimSpace(host))
	if host == "" {
		return errors.New("host is required")
	}
	if isBlockedMetadataHostname(host) {
		return fmt.Errorf("metadata host is not allowed: %s", host)
	}
	if ip := net.ParseIP(host); ip != nil {
		return validateResolvedAddress(ip, allowPrivate)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	ips, err := net.DefaultResolver.LookupIP(ctx, "ip", host)
	if err != nil {
		return fmt.Errorf("dns resolution failed: %w", err)
	}
	for _, ip := range ips {
		if err := validateResolvedAddress(ip, allowPrivate); err != nil {
			return err
		}
	}
	return nil
}

func validateHostLiteral(host string, allowPrivate bool) error {
	if isBlockedMetadataHostname(host) {
		return fmt.Errorf("metadata host is not allowed: %s", host)
	}
	if host == "localhost" || strings.HasSuffix(host, ".localhost") {
		if allowPrivate {
			return nil
		}
		return fmt.Errorf("host is not allowed: %s", host)
	}
	if ip := net.ParseIP(host); ip != nil {
		if err := validateResolvedAddress(ip, allowPrivate); err != nil {
			return fmt.Errorf("host is not allowed: %s: %w", host, err)
		}
	}
	return nil
}

func validateResolvedAddress(ip net.IP, allowPrivate bool) error {
	if ip == nil {
		return errors.New("resolved ip is invalid")
	}
	if isKnownMetadataIP(ip) || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() ||
		ip.IsUnspecified() || ip.IsMulticast() || ip.IsInterfaceLocalMulticast() {
		return fmt.Errorf("resolved ip %s is not allowed", ip.String())
	}
	if !allowPrivate && (ip.IsLoopback() || ip.IsPrivate()) {
		return fmt.Errorf("resolved ip %s is not allowed", ip.String())
	}
	return nil
}

func isKnownMetadataIP(ip net.IP) bool {
	for _, raw := range []string{
		"169.254.169.254", // AWS, Azure, GCP, OpenStack and others
		"100.100.100.200", // Alibaba Cloud
		"fd00:ec2::254",   // AWS IMDS IPv6 endpoint
	} {
		if candidate := net.ParseIP(raw); candidate != nil && candidate.Equal(ip) {
			return true
		}
	}
	return false
}

func isBlockedMetadataHostname(host string) bool {
	host = strings.TrimSuffix(strings.ToLower(strings.TrimSpace(host)), ".")
	return host == "metadata.google.internal" || strings.HasSuffix(host, ".metadata.google.internal") ||
		host == "metadata.goog" || strings.HasSuffix(host, ".metadata.goog") ||
		host == "metadata.tencentyun.com" || strings.HasSuffix(host, ".metadata.tencentyun.com")
}

func normalizeAllowlist(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	normalized := make([]string, 0, len(values))
	for _, v := range values {
		entry := strings.ToLower(strings.TrimSpace(v))
		if entry != "" {
			normalized = append(normalized, entry)
		}
	}
	return normalized
}

func isAllowedTarget(host, port, scheme string, allowlist []string) bool {
	effectivePort := port
	if effectivePort == "" {
		switch scheme {
		case "https":
			effectivePort = "443"
		case "http":
			effectivePort = "80"
		}
	}

	for _, entry := range allowlist {
		entryHost, entryPort := splitAllowlistEntry(entry)
		if entryHost == "" || (entryPort != "" && entryPort != effectivePort) {
			continue
		}
		if strings.HasPrefix(entryHost, "*.") {
			suffix := strings.TrimPrefix(entryHost, "*.")
			if host == suffix || strings.HasSuffix(host, "."+suffix) {
				return true
			}
			continue
		}
		if host == entryHost {
			return true
		}
	}
	return false
}

func splitAllowlistEntry(entry string) (string, string) {
	entry = strings.ToLower(strings.TrimSpace(entry))
	if entry == "" {
		return "", ""
	}
	if host, port, err := net.SplitHostPort(entry); err == nil {
		return strings.Trim(strings.TrimSpace(host), "[]"), strings.TrimSpace(port)
	}
	// Bare IPv6 literals contain multiple colons and intentionally have no port.
	if net.ParseIP(strings.Trim(entry, "[]")) != nil {
		return strings.Trim(entry, "[]"), ""
	}
	return entry, ""
}
