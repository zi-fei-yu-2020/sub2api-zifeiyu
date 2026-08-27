package setup

import (
	"crypto/sha256"
	"crypto/subtle"
	"errors"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
)

const (
	SetupTokenHeader     = "X-Setup-Token"
	setupAllowRemoteEnv  = "SETUP_ALLOW_REMOTE"
	setupTokenEnv        = "SETUP_TOKEN"
	defaultSetupBindHost = "127.0.0.1"
)

// RemoteWebSetupEnabled reports whether the operator explicitly allowed the
// first-run web wizard to bind to a non-loopback address.
func RemoteWebSetupEnabled() bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv(setupAllowRemoteEnv)))
	return value == "true" || value == "1" || value == "yes"
}

// WebSetupToken returns the operator-provided token used only during remote
// first-run setup. Callers must never log the returned value.
func WebSetupToken() string {
	return strings.TrimSpace(os.Getenv(setupTokenEnv))
}

// WebSetupServerAddress keeps the first-run wizard local unless remote setup
// is explicitly enabled. The configured port is preserved in local mode.
func WebSetupServerAddress(configuredAddress string) (string, error) {
	host, port, err := net.SplitHostPort(strings.TrimSpace(configuredAddress))
	if err != nil || port == "" {
		return "", errors.New("invalid setup server address")
	}
	portNumber, err := strconv.Atoi(port)
	if err != nil || portNumber < 1 || portNumber > 65535 {
		return "", errors.New("invalid setup server port")
	}

	if !RemoteWebSetupEnabled() {
		return net.JoinHostPort(defaultSetupBindHost, port), nil
	}
	if WebSetupToken() == "" {
		return "", errors.New("SETUP_TOKEN is required when SETUP_ALLOW_REMOTE is enabled")
	}

	// Preserve the configured address after validating its host/port shape.
	return net.JoinHostPort(host, port), nil
}

// validWebSetupToken compares fixed-length hashes so token length differences
// do not bypass the constant-time comparison primitive.
func validWebSetupToken(provided string) bool {
	expected := WebSetupToken()
	if expected == "" {
		return false
	}
	expectedHash := sha256.Sum256([]byte(expected))
	providedHash := sha256.Sum256([]byte(strings.TrimSpace(provided)))
	return subtle.ConstantTimeCompare(providedHash[:], expectedHash[:]) == 1
}

// isLoopbackSetupRequest intentionally trusts only the TCP peer address. It
// does not use X-Forwarded-For or similar headers during first-run setup.
func isLoopbackSetupRequest(request *http.Request) bool {
	if request == nil {
		return false
	}
	remoteAddress := strings.TrimSpace(request.RemoteAddr)
	host, _, err := net.SplitHostPort(remoteAddress)
	if err != nil {
		host = remoteAddress
	}
	if zoneIndex := strings.LastIndexByte(host, '%'); zoneIndex >= 0 {
		host = host[:zoneIndex]
	}
	ip := net.ParseIP(strings.Trim(host, "[]"))
	return ip != nil && ip.IsLoopback()
}
