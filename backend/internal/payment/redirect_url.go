package payment

import (
	"errors"
	"net/url"
	"strings"
	"unicode/utf8"
)

var ErrInvalidRedirectURL = errors.New("invalid payment redirect URL")

// NormalizeRedirectURL validates URLs that may be used for browser navigation.
// It accepts HTTPS absolute URLs and explicit same-site paths that begin with a
// single slash. QR code payloads must not use this validator because providers
// may legitimately return dedicated schemes such as weixin:// or alipays://.
func NormalizeRedirectURL(value string) (string, error) {
	raw := strings.TrimSpace(value)
	if raw == "" {
		return "", nil
	}
	if hasUnsafeURLCharacters(raw) || hasEncodedControlCharacters(raw) {
		return "", ErrInvalidRedirectURL
	}

	if strings.HasPrefix(raw, "/") {
		if strings.HasPrefix(raw, "//") || strings.Contains(raw, `\`) {
			return "", ErrInvalidRedirectURL
		}
		parsed, err := url.Parse(raw)
		if err != nil || parsed.IsAbs() || parsed.Host != "" || parsed.Opaque != "" || !strings.HasPrefix(parsed.Path, "/") {
			return "", ErrInvalidRedirectURL
		}
		return raw, nil
	}

	parsed, err := url.Parse(raw)
	if err != nil || !parsed.IsAbs() || !strings.EqualFold(parsed.Scheme, "https") || parsed.Host == "" || parsed.Hostname() == "" {
		return "", ErrInvalidRedirectURL
	}
	if parsed.User != nil || strings.Contains(raw, `\`) {
		return "", ErrInvalidRedirectURL
	}
	return raw, nil
}

// NormalizeQRCodeContent keeps payment QR payloads separate from browser
// redirects. Dedicated payment schemes and opaque provider tokens are allowed;
// only database-incompatible NUL bytes are removed.
func NormalizeQRCodeContent(value string) string {
	return strings.ReplaceAll(value, "\x00", "")
}

func hasUnsafeURLCharacters(value string) bool {
	if !utf8.ValidString(value) {
		return true
	}
	for _, r := range value {
		if r <= 0x1f || r == 0x7f {
			return true
		}
	}
	return false
}

func hasEncodedControlCharacters(value string) bool {
	decoded := value
	for i := 0; i < 3; i++ {
		next, err := url.PathUnescape(decoded)
		if err != nil {
			return true
		}
		if next == decoded {
			return false
		}
		if hasUnsafeURLCharacters(next) {
			return true
		}
		decoded = next
	}
	return false
}
