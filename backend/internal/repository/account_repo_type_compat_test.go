package repository

import (
	"testing"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/stretchr/testify/require"
)

func TestAccountEntityToServiceNormalizesLegacyAPIKeyType(t *testing.T) {
	account := accountEntityToService(&dbent.Account{Type: "api_key"})
	require.NotNil(t, account)
	require.Equal(t, service.AccountTypeAPIKey, account.Type)
}

func TestAccountEntityToServiceNormalizesLegacyInactiveStatus(t *testing.T) {
	account := accountEntityToService(&dbent.Account{Status: "inactive"})
	require.NotNil(t, account)
	require.Equal(t, service.StatusDisabled, account.Status)
}
