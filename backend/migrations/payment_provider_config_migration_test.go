package migrations

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestMigration233CreatesLegacyPaymentProviderConfigBackupTable(t *testing.T) {
	content, err := FS.ReadFile("233_payment_provider_config_legacy_backups.sql")
	require.NoError(t, err)

	sql := string(content)
	require.Contains(t, sql, "CREATE TABLE IF NOT EXISTS payment_provider_config_legacy_backups")
	require.Contains(t, sql, "provider_instance_id BIGINT PRIMARY KEY")
	require.Contains(t, sql, "encrypted_config TEXT NOT NULL")
	require.Contains(t, sql, "migration_status VARCHAR(32) NOT NULL")
}
