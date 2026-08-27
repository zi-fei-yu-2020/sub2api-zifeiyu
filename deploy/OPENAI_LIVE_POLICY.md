# OpenAI Live billing policy

OpenAI Live does not currently implement duration-based billing. To prevent a
zero-cost feature from being enabled silently, the global policy is fail-closed.

## Configuration

```yaml
gateway:
  live:
    billing_policy: disabled
    max_session_duration_seconds: 3600
```

Environment variable:

```text
GATEWAY_LIVE_BILLING_POLICY=disabled
```

Supported values:

- `disabled` (default): reject Live creation and sideband access even when a
  group still has `allow_live=true`.
- `explicit_free`: the operator explicitly accepts zero-cost Live sessions.
  Usage logs are written with `request_type=live`, zero costs, and
  `billing_tier=live_explicit_free`.

There is intentionally no `duration` policy yet. Do not configure an unlisted
value; startup validation fails instead of guessing a price.

## Existing deployments

Deployments upgraded from a version without `gateway.live.billing_policy` are
not grandfathered into free Live. The effective policy becomes `disabled`, and
a startup warning explains that existing `allow_live` groups remain blocked.

To keep Live enabled deliberately:

1. Review upstream costs and the absence of duration billing.
2. Set `gateway.live.billing_policy: explicit_free` (or the environment variable).
3. Restart Sub2API.
4. Confirm the group-level `allow_live` switch.

## Limits that still apply

`explicit_free` only acknowledges the zero-cost policy. It does not disable:

- user/group RPM checks already executed by billing eligibility;
- API-key usage-window limits;
- user and upstream-account concurrency leases;
- `gateway.live.max_session_duration_seconds`;
- group platform and `allow_live` checks;
- attestation/runtime capability checks.

No additional process-local API-key rate limiter is introduced. Live reuses the
existing distributed billing/RPM and concurrency controls so multi-instance
behavior remains consistent.

## Usage record compatibility

New sessions created under `explicit_free` are marked
`billing_tier=live_explicit_free`. A session created by an older version and
finalized after upgrade is marked `billing_tier=live_legacy_unpriced`, making
legacy unpriced traffic distinguishable without rewriting historical data.
