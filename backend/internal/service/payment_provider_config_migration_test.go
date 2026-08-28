package service

import (
	"context"
	"testing"

	entsql "entgo.io/ent/dialect/sql"
	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/internal/payment"
	"github.com/stretchr/testify/require"
)

func TestMigrateLegacyProviderConfigsConvertsCiphertextToJSON(t *testing.T) {
	client := newPaymentConfigServiceTestClient(t)
	createLegacyPaymentConfigBackupTable(t, client)
	key := make([]byte, payment.AES256KeySize)
	for i := range key {
		key[i] = byte(i + 1)
	}
	//nolint:staticcheck // Intentionally seed the deprecated format for migration coverage.
	legacy, err := payment.Encrypt(`{"pid":"merchant","pkey":"secret"}`, key)
	require.NoError(t, err)
	instance := client.PaymentProviderInstance.Create().
		SetProviderKey(payment.TypeEasyPay).
		SetName("legacy").
		SetConfig(legacy).
		SetEnabled(true).
		SaveX(context.Background())

	svc := NewPaymentConfigService(client, nil, key)
	summary, err := svc.MigrateLegacyProviderConfigs(context.Background())
	require.NoError(t, err)
	require.Equal(t, PaymentProviderConfigMigrationSummary{Scanned: 1, Migrated: 1}, summary)

	updated := client.PaymentProviderInstance.GetX(context.Background(), instance.ID)
	require.True(t, updated.Enabled)
	require.JSONEq(t, `{"pid":"merchant","pkey":"secret"}`, updated.Config)
	backup := readLegacyPaymentConfigBackup(t, client, int64(instance.ID))
	require.Equal(t, legacy, backup.encryptedConfig)
	require.Equal(t, paymentConfigMigrationStatusMigrated, backup.status)
	require.Empty(t, backup.migrationError)
}

func TestMigrateLegacyProviderConfigsPreservesAndDisablesUnreadableCiphertext(t *testing.T) {
	client := newPaymentConfigServiceTestClient(t)
	createLegacyPaymentConfigBackupTable(t, client)
	instance := client.PaymentProviderInstance.Create().
		SetProviderKey(payment.TypeEasyPay).
		SetName("legacy-unreadable").
		SetConfig("iv:tag:ciphertext").
		SetEnabled(true).
		SaveX(context.Background())

	svc := NewPaymentConfigService(client, nil, nil)
	summary, err := svc.MigrateLegacyProviderConfigs(context.Background())
	require.NoError(t, err)
	require.Equal(t, PaymentProviderConfigMigrationSummary{Scanned: 1, NeedsReentry: 1}, summary)

	updated := client.PaymentProviderInstance.GetX(context.Background(), instance.ID)
	require.False(t, updated.Enabled)
	require.JSONEq(t, `{}`, updated.Config)
	backup := readLegacyPaymentConfigBackup(t, client, int64(instance.ID))
	require.Equal(t, "iv:tag:ciphertext", backup.encryptedConfig)
	require.Equal(t, paymentConfigMigrationStatusNeedsReentry, backup.status)
	require.NotEmpty(t, backup.migrationError)
}

func createLegacyPaymentConfigBackupTable(t *testing.T, client *dbent.Client) {
	t.Helper()
	var result entsql.Result
	err := client.Driver().Exec(context.Background(), `CREATE TABLE payment_provider_config_legacy_backups (
		provider_instance_id INTEGER PRIMARY KEY,
		encrypted_config TEXT NOT NULL,
		original_enabled BOOLEAN NOT NULL DEFAULT FALSE,
		migration_status VARCHAR(32) NOT NULL,
		migration_error VARCHAR(255) NOT NULL DEFAULT '',
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	)`, []any{}, &result)
	require.NoError(t, err)
}

type legacyPaymentConfigBackup struct {
	encryptedConfig string
	status          string
	migrationError  string
}

func readLegacyPaymentConfigBackup(t *testing.T, client *dbent.Client, instanceID int64) legacyPaymentConfigBackup {
	t.Helper()
	var rows entsql.Rows
	err := client.Driver().Query(context.Background(), `SELECT encrypted_config, migration_status, migration_error
FROM payment_provider_config_legacy_backups WHERE provider_instance_id = ?`, []any{instanceID}, &rows)
	require.NoError(t, err)
	defer func() { require.NoError(t, rows.Close()) }()
	require.True(t, rows.Next())
	var backup legacyPaymentConfigBackup
	require.NoError(t, rows.Scan(&backup.encryptedConfig, &backup.status, &backup.migrationError))
	return backup
}
