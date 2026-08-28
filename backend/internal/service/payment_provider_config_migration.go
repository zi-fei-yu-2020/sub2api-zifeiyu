package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"

	"entgo.io/ent/dialect/sql"
	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/internal/payment"
)

const (
	paymentConfigMigrationStatusMigrated     = "migrated"
	paymentConfigMigrationStatusNeedsReentry = "needs_reentry"
)

type PaymentProviderConfigMigrationSummary struct {
	Scanned      int
	Migrated     int
	NeedsReentry int
}

// MigrateLegacyProviderConfigs converts the pre-JSON AES-GCM provider configs.
// The original ciphertext is stored in payment_provider_config_legacy_backups
// before the live row is changed. Unreadable configs are replaced with an empty
// JSON object and disabled so runtime code can enforce strict JSON parsing
// without silently activating a provider with missing credentials.
func (s *PaymentConfigService) MigrateLegacyProviderConfigs(ctx context.Context) (PaymentProviderConfigMigrationSummary, error) {
	var summary PaymentProviderConfigMigrationSummary
	if s == nil || s.entClient == nil {
		return summary, nil
	}
	instances, err := s.entClient.PaymentProviderInstance.Query().All(ctx)
	if err != nil {
		return summary, fmt.Errorf("query payment provider configs for migration: %w", err)
	}

	for _, instance := range instances {
		stored := strings.TrimSpace(instance.Config)
		if stored == "" || isStrictPaymentProviderConfigJSON(stored) {
			continue
		}
		summary.Scanned++
		migratedConfig, decryptErr := decodeLegacyPaymentProviderConfig(stored, s.encryptionKey)
		status := paymentConfigMigrationStatusMigrated
		migrationError := ""
		nextConfig := "{}"
		nextEnabled := instance.Enabled
		if decryptErr != nil {
			status = paymentConfigMigrationStatusNeedsReentry
			migrationError = "legacy config could not be decrypted with the configured key"
			nextEnabled = false
			summary.NeedsReentry++
		} else {
			encoded, marshalErr := json.Marshal(migratedConfig)
			if marshalErr != nil {
				return summary, fmt.Errorf("marshal migrated config for provider instance %d: %w", instance.ID, marshalErr)
			}
			nextConfig = string(encoded)
			summary.Migrated++
		}

		tx, err := s.entClient.Tx(ctx)
		if err != nil {
			return summary, fmt.Errorf("begin provider config migration for instance %d: %w", instance.ID, err)
		}
		if err := backupLegacyPaymentProviderConfig(ctx, tx.Client(), int64(instance.ID), stored, instance.Enabled, status, migrationError); err != nil {
			_ = tx.Rollback()
			return summary, err
		}
		if _, err := tx.Client().PaymentProviderInstance.UpdateOneID(instance.ID).
			SetConfig(nextConfig).
			SetEnabled(nextEnabled).
			Save(ctx); err != nil {
			_ = tx.Rollback()
			return summary, fmt.Errorf("update migrated provider config for instance %d: %w", instance.ID, err)
		}
		if err := tx.Commit(); err != nil {
			return summary, fmt.Errorf("commit provider config migration for instance %d: %w", instance.ID, err)
		}

		if decryptErr != nil {
			slog.Warn("legacy payment provider config preserved and disabled for re-entry",
				"provider_instance_id", instance.ID,
				"provider_key", instance.ProviderKey,
			)
		}
	}
	return summary, nil
}

func isStrictPaymentProviderConfigJSON(stored string) bool {
	var config map[string]string
	return json.Unmarshal([]byte(stored), &config) == nil && config != nil
}

func decodeLegacyPaymentProviderConfig(stored string, key []byte) (map[string]string, error) {
	if len(key) != payment.AES256KeySize {
		return nil, fmt.Errorf("legacy payment provider config requires the original encryption key")
	}
	//nolint:staticcheck // This is the one-time migration path for the deprecated storage format.
	plaintext, err := payment.Decrypt(stored, key)
	if err != nil {
		return nil, fmt.Errorf("decrypt legacy payment provider config: %w", err)
	}
	var config map[string]string
	if err := json.Unmarshal([]byte(plaintext), &config); err != nil || config == nil {
		return nil, fmt.Errorf("legacy payment provider config plaintext is not a JSON object")
	}
	return config, nil
}

func backupLegacyPaymentProviderConfig(
	ctx context.Context,
	client *dbent.Client,
	instanceID int64,
	stored string,
	originalEnabled bool,
	status string,
	migrationError string,
) error {
	var result sql.Result
	query := `INSERT INTO payment_provider_config_legacy_backups
(provider_instance_id, encrypted_config, original_enabled, migration_status, migration_error, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (provider_instance_id) DO UPDATE SET
    migration_status = EXCLUDED.migration_status,
    migration_error = EXCLUDED.migration_error,
    updated_at = CURRENT_TIMESTAMP`
	args := []any{instanceID, stored, originalEnabled, status, migrationError}
	if client.Driver().Dialect() == "sqlite3" {
		query = strings.ReplaceAll(query, "$1", "?")
		query = strings.ReplaceAll(query, "$2", "?")
		query = strings.ReplaceAll(query, "$3", "?")
		query = strings.ReplaceAll(query, "$4", "?")
		query = strings.ReplaceAll(query, "$5", "?")
	}
	if err := client.Driver().Exec(ctx, query, args, &result); err != nil {
		return fmt.Errorf("backup legacy provider config for instance %d: %w", instanceID, err)
	}
	return nil
}
