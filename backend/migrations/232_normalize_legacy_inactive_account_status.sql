-- Accept old clients but keep one canonical disabled account status in storage.
UPDATE accounts
SET status = 'disabled',
    updated_at = NOW()
WHERE status = 'inactive';
