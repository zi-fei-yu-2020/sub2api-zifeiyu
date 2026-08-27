# First-run Web Setup Security

Sub2API protects the first-run web installer because it can test database and Redis connections and create the initial administrator.

## Safe default: local-only setup

When the system is not installed, the setup server binds to `127.0.0.1` by default, regardless of the normal `SERVER_HOST` value. The following mutation endpoints also reject non-loopback TCP peers:

- `POST /setup/test-db`
- `POST /setup/test-redis`
- `POST /setup/install`

For a remote server, use an SSH tunnel instead of exposing the installer:

```bash
ssh -L 8080:127.0.0.1:8080 user@your-server
```

Then open `http://127.0.0.1:8080/setup` locally.

## Explicit remote setup

Only enable remote setup when an SSH tunnel is not possible. Generate a dedicated, temporary token:

```bash
export SETUP_ALLOW_REMOTE=true
export SETUP_TOKEN="$(openssl rand -hex 32)"
export SERVER_HOST=0.0.0.0
./sub2api
```

Open the wizard with the token in the URL **fragment**:

```text
http://YOUR_SERVER_IP:8080/setup#setup_token=YOUR_SETUP_TOKEN
```

The fragment is removed from the address bar immediately and is not sent in the HTTP request URL. The frontend keeps the token in `sessionStorage` and sends it through:

```text
X-Setup-Token: YOUR_SETUP_TOKEN
```

`GET /setup/status` remains read-only and returns `requires_token: true` while remote setup is enabled. All three mutation endpoints require the token. The server never prints the token value in its own logs.

## Operational requirements

- Use a unique setup token; do not reuse `JWT_SECRET`, database passwords, or API keys.
- Prefer HTTPS or a private management network. The token header is sensitive on plaintext HTTP.
- Do not put the token in a query string; query strings are commonly stored in access logs.
- Restrict port `8080` with a firewall while setup is active.
- Remove `SETUP_ALLOW_REMOTE` and `SETUP_TOKEN` after installation, then restart the service.
- Do not expose the first-run setup server through a public reverse proxy unless the proxy also enforces independent access control.

## 中文说明

首次安装向导可以探测数据库、Redis，并创建初始管理员，因此默认仅监听 `127.0.0.1`。远程服务器推荐使用 SSH 隧道：

```bash
ssh -L 8080:127.0.0.1:8080 user@your-server
```

如确实需要公网或局域网远程安装，必须同时设置 `SETUP_ALLOW_REMOTE=true` 和独立的 `SETUP_TOKEN`，并通过 URL fragment 打开：

```text
http://服务器IP:8080/setup#setup_token=安装令牌
```

前端会立即移除 fragment，并在后续请求中通过 `X-Setup-Token` 请求头发送令牌。安装完成后应删除这两个环境变量并重启服务。
