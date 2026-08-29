package handler

import (
	"strings"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/stretchr/testify/require"
)

func TestBuildLinuxDoOAuthEmail(t *testing.T) {
	require.Equal(t, "alice@ldc.112102.xyz", buildLinuxDoOAuthEmail(" Alice ", "123"))
	require.Equal(t, "alice.dev-1@ldc.112102.xyz", buildLinuxDoOAuthEmail("Alice.Dev-1", "123"))
	require.Equal(t, "linuxdo-123@ldc.112102.xyz", buildLinuxDoOAuthEmail("___", "123"))
	require.Equal(t, "linuxdo-123@ldc.112102.xyz", buildLinuxDoOAuthEmail(strings.Repeat("a", 65), "123"))
	require.Empty(t, buildLinuxDoOAuthEmail("", ""))
}

func TestIsReservedOAuthSyntheticEmailIncludesLinuxDoLegacyDomain(t *testing.T) {
	require.True(t, isReservedOAuthSyntheticEmail("new"+service.LinuxDoConnectSyntheticEmailDomain))
	require.True(t, isReservedOAuthSyntheticEmail("legacy"+service.LinuxDoConnectLegacyEmailDomain))
	require.True(t, isReservedOAuthSyntheticEmail("oidc"+service.OIDCConnectSyntheticEmailDomain))
	require.False(t, isReservedOAuthSyntheticEmail("person@example.com"))
}
