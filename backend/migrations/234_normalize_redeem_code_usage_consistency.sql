-- Normalize historical redeem-code usage markers before enforcing consistency.
-- A historical used code may lack used_by when the source system did not retain
-- a recoverable user mapping. Such rows remain status=used with used_at present:
-- they stay non-redeemable and are surfaced by the service as an audit issue.
-- Backfilled used_at values use created_at as a stable recovery timestamp; they do not
-- necessarily represent the exact historical redemption time.

CREATE TABLE IF NOT EXISTS redeem_code_usage_consistency_backups (
    redeem_code_id BIGINT PRIMARY KEY,
    original_status VARCHAR(20) NOT NULL,
    original_used_by BIGINT,
    original_used_at TIMESTAMPTZ,
    backed_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO redeem_code_usage_consistency_backups (
    redeem_code_id,
    original_status,
    original_used_by,
    original_used_at
)
SELECT id, status, used_by, used_at
FROM redeem_codes
WHERE (status = 'used' AND (used_by IS NULL OR used_at IS NULL))
   OR (status <> 'used' AND (used_by IS NOT NULL OR used_at IS NOT NULL))
ON CONFLICT (redeem_code_id) DO NOTHING;

UPDATE redeem_codes
SET status = 'used',
    used_at = COALESCE(used_at, created_at)
WHERE status <> 'used'
  AND (used_by IS NOT NULL OR used_at IS NOT NULL);

UPDATE redeem_codes
SET used_at = created_at
WHERE status = 'used'
  AND used_at IS NULL;

ALTER TABLE redeem_codes
  DROP CONSTRAINT IF EXISTS chk_redeem_codes_usage_consistency;

ALTER TABLE redeem_codes
  ADD CONSTRAINT chk_redeem_codes_usage_consistency CHECK (
    (status = 'used' AND used_at IS NOT NULL)
    OR
    (status <> 'used' AND used_by IS NULL AND used_at IS NULL)
  );
