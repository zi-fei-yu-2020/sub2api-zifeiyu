package service

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestNormalizeAccountTypeAcceptsLegacyAPIKeyAlias(t *testing.T) {
	require.Equal(t, AccountTypeAPIKey, NormalizeAccountType("api_key"))
	require.Equal(t, AccountTypeAPIKey, NormalizeAccountType(" API_KEY "))
	require.Equal(t, AccountTypeOAuth, NormalizeAccountType(AccountTypeOAuth))
}
