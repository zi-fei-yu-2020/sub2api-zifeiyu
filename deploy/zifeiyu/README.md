# zifeiyu Production Deployment

This directory tracks the production topology used by the zifeiyu downstream edition without committing live credentials or runtime data.

## Topology

- Application: `sub2api-zifeiyu`, bound only to `127.0.0.1:18080`.
- PostgreSQL: dedicated `sub2api-zifeiyu-postgres` with bind-mounted fresh data.
- Redis: dedicated `sub2api-zifeiyu-redis` with AOF persistence.
- Internal network: `sub2api-zifeiyu-network` (`172.29.50.0/24`).
- Application-only dual-stack egress: `sub2api-zifeiyu-egress-v6`.
- Nginx: `sub2api.112102.xyz` proxies to `127.0.0.1:18080`.

PostgreSQL and Redis are not attached to the IPv6 egress network. The egress network exists so the application can reach upstream proxy hosts that publish only AAAA records.

## Security profile

This deployment intentionally uses:

```env
SECURITY_URL_POLICY_PROFILE=compatible
```

It is required for accounts whose upstream endpoint is `http://...` plus an API key. This profile permits HTTP/private upstream URLs and disables the strict outbound URL allowlist, reducing SSRF protection. Use `strict` when those compatibility requirements do not exist.

There is currently no admin-panel control for this startup-level setting. Change `.env` and recreate the application container.

## Prepare a fresh deployment

```bash
cd deploy/zifeiyu
cp .env.example .env
chmod 600 .env
```

Generate independent secrets and put them in `.env`:

```bash
openssl rand -hex 24 # POSTGRES_PASSWORD
openssl rand -hex 24 # REDIS_PASSWORD
openssl rand -hex 32 # JWT_SECRET
openssl rand -hex 32 # TOTP_ENCRYPTION_KEY
openssl rand -hex 16 # ADMIN_PASSWORD or use another strong password
```

Do not copy an existing Sub2API database into this stack. The first startup initializes an empty schema and creates only the configured administrator.

Build and start:

```bash
docker compose --env-file .env build sub2api
docker compose --env-file .env up -d

docker compose --env-file .env ps
curl http://127.0.0.1:18080/health
```

The default build context is the repository root (`../..`) because this Compose file lives in `deploy/zifeiyu`.

## Existing server layout

The current server keeps the Git checkout under `app/` and the Compose/runtime files one level above it:

```text
/root/zifeiyu/project/sub2api/
├── app/                 # Git checkout
├── docker-compose.yml
├── .env                 # live secrets; never commit
└── fresh/
    ├── data/
    ├── postgres_data/
    └── redis_data/
```

To reproduce that layout:

```bash
cp app/deploy/zifeiyu/docker-compose.yml ./docker-compose.yml
cp app/deploy/zifeiyu/.env.example ./.env
```

Then set:

```env
SUB2API_BUILD_CONTEXT=./app
```

Build metadata can be supplied from Git:

```bash
export SUB2API_COMMIT="$(git -C app rev-parse --short=9 HEAD)"
export SUB2API_IMAGE_TAG="$SUB2API_COMMIT"
docker compose build sub2api
docker compose up -d --no-deps --force-recreate sub2api
```

## Nginx

Install the tracked virtual host after checking certificate paths:

```bash
sudo cp nginx/sub2api.112102.xyz.conf /etc/nginx/conf.d/sub2api.112102.xyz.conf
sudo nginx -t
sudo systemctl reload nginx
```

The application port remains loopback-only. Public access goes through Nginx and the configured TLS/CDN layer.

### LinuxDO Connect callback

Register this exact callback URL in both the Sub2API admin setting and the LinuxDO Connect application:

```text
https://sub2api.112102.xyz/api/v1/auth/oauth/linuxdo/callback
```

The tracked Nginx vhost redirects legacy New-API callback paths (`/oauth/linuxdo` and `/api/oauth/linuxdo`) to the canonical backend callback while preserving `code` and `state`. The redirect is required before backend handling so path-scoped OAuth cookies are sent on the canonical request.

Do not use the incorrect path `/api/v1/auth/linuxdo/callback`; it is missing the `/oauth/` segment.

## IPv6-only SOCKS proxies

Verify the application received an IPv6 route:

```bash
docker exec sub2api-zifeiyu ip -6 route
```

Expected network attachment:

```text
sub2api-zifeiyu-network
sub2api-zifeiyu-egress-v6
```

PostgreSQL and Redis must remain attached only to `sub2api-zifeiyu-network`.

If the fixed subnets conflict with another Docker network, choose unused IPv4/IPv6 ranges and update `SERVER_TRUSTED_PROXIES` when changing the internal network gateway.

## Updates

The zifeiyu build blocks upstream in-place binary update and rollback. Update by pulling this repository, running tests, rebuilding the Docker image, and recreating only the application container. Do not use the upstream `Wei-Shaw/sub2api` release binary to overwrite this custom edition.

## Files intentionally excluded

The following are ignored and must never be committed:

```text
.env
fresh/
*.backup
*.bak
*.log
```
