package setup

import (
	"crypto/subtle"
	"errors"
	"net"
	"os"
	"strings"
)

const SetupTokenHeader = "X-Setup-Token"

func RemoteWebSetupEnabled() bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv("SETUP_ALLOW_REMOTE")))
	return value == "true" || value == "1" || value == "yes"
}

func WebSetupToken() string {
	return strings.TrimSpace(os.Getenv("SETUP_TOKEN"))
}

// WebSetupServerAddress keeps the first-run wizard local unless remote setup is explicitly enabled.
func WebSetupServerAddress(configuredAddress string) (string, error) {
	_, port, err := net.SplitHostPort(strings.TrimSpace(configuredAddress))
	if err != nil || port == "" {
		return "", errors.New("invalid setup server address")
	}
	if !RemoteWebSetupEnabled() {
		return net.JoinHostPort("127.0.0.1", port), nil
	}
	if WebSetupToken() == "" {
		return "", errors.New("SETUP_TOKEN is required when SETUP_ALLOW_REMOTE is enabled")
	}
	return configuredAddress, nil
}

func validWebSetupToken(provided string) bool {
	expected := WebSetupToken()
	provided = strings.TrimSpace(provided)
	return expected != "" && len(provided) == len(expected) &&
		subtle.ConstantTimeCompare([]byte(provided), []byte(expected)) == 1
}
