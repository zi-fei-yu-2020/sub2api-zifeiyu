-- Normalize the legacy new-api migration alias so runtime filters and account tests use the canonical type.
UPDATE accounts
SET type = 'apikey',
    updated_at = NOW()
WHERE type = 'api_key';
