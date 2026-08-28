package migrations

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestMigration234NormalizesRedeemUsageWithoutReactivatingOrphans(t *testing.T) {
	content, err := FS.ReadFile("234_normalize_redeem_code_usage_consistency.sql")
	require.NoError(t, err)

	sql := string(content)
	require.Contains(t, sql, "CREATE TABLE IF NOT EXISTS redeem_code_usage_consistency_backups")
	require.Contains(t, sql, "INSERT INTO redeem_code_usage_consistency_backups")
	require.Contains(t, sql, "original_status VARCHAR(20) NOT NULL")
	require.Contains(t, sql, "ON CONFLICT (redeem_code_id) DO NOTHING")
	require.Contains(t, sql, "UPDATE redeem_codes")
	require.Contains(t, sql, "SET status = 'used'")
	require.Contains(t, sql, "used_at = COALESCE(used_at, created_at)")
	require.Contains(t, sql, "WHERE status <> 'used'")
	require.Contains(t, sql, "used_by IS NOT NULL OR used_at IS NOT NULL")
	require.Contains(t, sql, "WHERE status = 'used'")
	require.Contains(t, sql, "AND used_at IS NULL")
	require.Contains(t, sql, "DROP CONSTRAINT IF EXISTS chk_redeem_codes_usage_consistency")
	require.Contains(t, sql, "status = 'used' AND used_at IS NOT NULL")
	require.Contains(t, sql, "status <> 'used' AND used_by IS NULL AND used_at IS NULL")
	// Historical orphaned used rows remain used and auditable; the migration
	// must not invent a user ID or reactivate them as unused.
	require.NotContains(t, sql, "SET used_by =")
	require.NotContains(t, sql, "SET status = 'unused'")
}
