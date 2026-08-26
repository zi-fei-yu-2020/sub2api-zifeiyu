package migrations

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestNormalizeLegacyAPIKeyAccountTypeMigration(t *testing.T) {
	content, err := FS.ReadFile("231_normalize_legacy_api_key_account_type.sql")
	require.NoError(t, err)

	sql := strings.Join(strings.Fields(string(content)), " ")
	require.Contains(t, sql, "UPDATE accounts")
	require.Contains(t, sql, "SET type = 'apikey'")
	require.Contains(t, sql, "WHERE type = 'api_key'")
}
