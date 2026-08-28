-- Preserve legacy encrypted payment provider configs before the application
-- migrates payment_provider_instances.config to strict JSON storage.
CREATE TABLE IF NOT EXISTS payment_provider_config_legacy_backups (
    provider_instance_id BIGINT PRIMARY KEY,
    encrypted_config TEXT NOT NULL,
    original_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    migration_status VARCHAR(32) NOT NULL,
    migration_error VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_provider_config_legacy_backups_status
    ON payment_provider_config_legacy_backups(migration_status);
