# Outbound URL Security Profiles

Sub2API applies one outbound URL policy to configurable API upstreams, pricing downloads, and CRS synchronization.

## Profiles

- `strict` is the default for new installations. It requires HTTPS, a matching host or `host:port` allowlist entry, and public DNS results. Loopback, RFC1918/private, link-local, multicast, unspecified, and known cloud metadata targets are rejected.
- `private-network` still requires an explicit allowlist match, but permits HTTP and loopback/private targets for trusted LAN services. Link-local and cloud metadata targets remain blocked. Use an explicit port for non-default services, for example `192.168.1.20:11434`.
- `compatible` preserves the historical permissive behavior: URL format and scheme are checked, but host allowlists and DNS-based SSRF checks are disabled. Use it only as a temporary migration mode.

```yaml
security:
  url_policy:
    profile: strict
  url_allowlist:
    upstream_hosts:
      - api.openai.com
      - api.anthropic.com
    pricing_hosts:
      - raw.githubusercontent.com
    crs_hosts: []
```

Environment variable:

```text
SECURITY_URL_POLICY_PROFILE=strict
```

Allowlist environment variables are comma-separated:

```text
SECURITY_URL_ALLOWLIST_UPSTREAM_HOSTS=api.openai.com,api.anthropic.com
SECURITY_URL_ALLOWLIST_PRICING_HOSTS=raw.githubusercontent.com
SECURITY_URL_ALLOWLIST_CRS_HOSTS=crs.example.com
```

Every redirect is validated again before dispatch. DNS results are checked against the selected profile; redirects to hosts outside the allowlist and resolutions to forbidden address ranges are rejected.

## Upgrade compatibility

An existing config file without `security.url_policy.profile` keeps its previous `security.url_allowlist.*` switches. The effective profile is reported as `compatible`, `LegacyCompatibility` is enabled internally, and startup logs a migration warning. This avoids silently breaking existing private or HTTP upstreams.

To complete migration, explicitly choose one profile and verify every required host is present in the matching allowlist. New setup-generated configurations always persist:

```yaml
security:
  url_policy:
    profile: strict
```

The legacy environment variables remain accepted during migration, but an explicit profile overrides their three behavior switches:

- `SECURITY_URL_ALLOWLIST_ENABLED`
- `SECURITY_URL_ALLOWLIST_ALLOW_PRIVATE_HOSTS`
- `SECURITY_URL_ALLOWLIST_ALLOW_INSECURE_HTTP`

## 中文说明

- `strict` 是新安装的默认策略：只允许 HTTPS，目标必须命中白名单，并拒绝回环、私网、链路本地和云 Metadata 地址。
- `private-network` 适用于 Ollama 或受信任的内网上游：仍然必须显式配置白名单，可允许 HTTP 和私网地址，但云 Metadata 和链路本地地址始终拒绝。
- `compatible` 仅用于旧部署过渡：保留历史 URL 格式/协议检查，不强制主机白名单和 DNS SSRF 检查，不建议长期使用。

已有配置文件如果没有 `security.url_policy.profile`，升级时会暂时保留原有 `url_allowlist` 行为，避免突然中断 HTTP 或私网上游。建议尽快核对白名单，然后显式迁移到 `strict` 或 `private-network`。
