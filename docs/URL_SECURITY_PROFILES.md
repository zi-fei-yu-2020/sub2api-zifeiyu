# 出站 URL / SSRF 安全档位

Sub2API 使用 `security.url_policy.profile` 控制管理员可配置的上游、定价和 CRS 地址。新安装默认使用 `strict`；升级前已经存在但没有该字段的 `config.yaml` 会继续保留旧版 `url_allowlist` 开关，避免升级后突然中断私有网关。

## 档位

### `strict`（推荐）

```yaml
security:
  url_policy:
    profile: strict
```

- 开启主机白名单；
- 仅允许 HTTPS；
- 禁止回环、RFC1918 私网、链路本地、组播和未指定地址；
- 每次请求及重定向都重新检查目标主机；
- DNS 解析结果也必须满足公网策略；
- 云元数据目标始终禁止。

默认 `upstream_hosts` 和 `pricing_hosts` 已包含项目内置公共服务。使用 CRS 时，需要显式配置 `crs_hosts`。

### `private-network`

```yaml
security:
  url_policy:
    profile: private-network
  url_allowlist:
    upstream_hosts:
      - "api.openai.com"
      - "api.anthropic.com"
      - "192.168.1.20:11434"
      - "host.docker.internal:11434"
    pricing_hosts:
      - "raw.githubusercontent.com"
    crs_hosts:
      - "crs.internal.example:8443"
```

- 允许回环和 RFC1918 私网地址；
- 允许 HTTP，但目标必须在对应白名单中；
- 白名单支持 `host`、`host:port` 和 `*.example.com`；
- 配置端口后只允许该端口；
- 链路本地地址、云元数据地址、组播和未指定地址仍然禁止；
- 重定向不能跳出对应白名单。

推荐为内网服务配置可信证书并继续使用 HTTPS。只有 Ollama 等确实需要明文 HTTP 的服务才使用 HTTP。

### `compatible`

```yaml
security:
  url_policy:
    profile: compatible
```

保持旧版宽松行为：关闭主机白名单，并允许私网和 HTTP。该档位只用于迁移，不建议长期用于公网生产环境。启动日志会持续输出安全警告。

## Docker 环境变量

```env
SECURITY_URL_POLICY_PROFILE=strict
```

内网服务示例：

```env
SECURITY_URL_POLICY_PROFILE=private-network
SECURITY_URL_ALLOWLIST_UPSTREAM_HOSTS=api.openai.com,api.anthropic.com,192.168.1.20:11434
```

## 旧配置迁移

旧字段仍可读取：

```yaml
security:
  url_allowlist:
    enabled: false
    allow_private_hosts: true
    allow_insecure_http: true
```

如果已有配置文件没有 `security.url_policy.profile`，程序会保留这些值，并将运行状态标记为 legacy-compatible。迁移时请：

1. 把所有实际使用的上游、定价和 CRS 主机加入对应白名单；
2. 如果只访问公网 HTTPS，设置 `profile: strict`；
3. 如果需要 Ollama/内网网关，设置 `profile: private-network` 并显式列出主机，最好同时限制端口；
4. 重启后检查日志中是否仍出现 legacy-compatible 或 compatible 警告；
5. 验证账号测试、模型列表、定价同步和 CRS 同步。

显式 `profile` 的优先级高于三个旧布尔开关。完成迁移后可删除旧布尔开关。

## 永久禁止的目标

即使使用 `private-network`，以下目标仍不会放行：

- `169.254.0.0/16` 等链路本地地址；
- `169.254.169.254`；
- `100.100.100.200`；
- `metadata.google.internal` 与 `metadata.goog`；
- 组播地址和未指定地址。
