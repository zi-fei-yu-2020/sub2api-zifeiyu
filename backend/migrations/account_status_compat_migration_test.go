package migrations

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestNormalizeLegacyInactiveAccountStatusMigration(t *testing.T) {
	content, err := FS.ReadFile("232_normalize_legacy_inactive_account_status.sql")
	require.NoError(t, err)
	sql := strings.Join(strings.Fields(string(content)), " ")
	require.Contains(t, sql, "UPDATE accounts")
	require.Contains(t, sql, "SET status = 'disabled'")
	require.Contains(t, sql, "WHERE status = 'inactive'")
}
