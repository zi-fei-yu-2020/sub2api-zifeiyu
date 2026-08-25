# Sub2API 二开项目全量代码审计报告

- 审计日期：2026-08-25
- 审计目录：`D:/wangkai/workspace/sub2api-zifeiyu-main`
- 审计方式：静态代码审查、危险模式扫描、路由/鉴权追踪、依赖审计、构建/类型检查/Lint、前后端测试复核
- Repository baseline: local `main` is connected to `origin/main`; remediation commits are recorded in Git history.

> **Remediation update - August 25, 2026:** The repository is now connected to its remote history. All release-blocking findings and affected frontend regressions have been fixed and pushed to `main`. The original findings below are retained as the audit trail; this status section is authoritative and supersedes the original release recommendation.

## 0. Remediation status

| Finding | Status | Resolution |
|---|---|---|
| A-01 Remote first-run takeover | RESOLVED | Setup defaults to loopback; remote setup requires explicit opt-in and `X-Setup-Token`. |
| A-02 Non-atomic refresh rotation | RESOLVED | Redis Lua rotation, bounded tombstones, replay grace, family revocation, and concurrency tests. |
| A-03 pnpm frozen install | RESOLVED | pnpm 9.15.9 pinned across package, CI, and Docker; lockfile synchronized. |
| A-04 Windows plugin install | RESOLVED | ZIP handle is closed before rename; Windows tests pass. |
| A-05 Tokens in localStorage | RESOLVED for browser refresh tokens | New browser sessions use an HttpOnly cookie; legacy localStorage sessions migrate on the next successful refresh; JSON remains for API-client compatibility. |
| A-06 Unsanitized custom home HTML | RESOLVED | DOMPurify policy and executable-markup regression tests added. |
| A-07 Affiliate registration field | RESOLVED | Optional affiliate code restored without duplicating mandatory invitations. |
| A-08 permissive URL/SSRF defaults | OPEN | Requires a compatibility-preserving security-profile migration. |
| A-09 vulnerable xlsx dependency | RESOLVED | XLSX export replaced with formula-safe UTF-8 CSV; xlsx removed from source and lockfile. |
| A-10 incomplete frontend CI gate | RESOLVED | Full frontend Vitest suite is required by CI. |
| A-11 model plaza visibility | RESOLVED | Home entry honors `model_plaza_require_auth`. |
| A-12 nondeterministic moderation test | RESOLVED | Snapshot time is forced instead of relying on a 1ns wall-clock delta. |
| A-13 oversized frontend chunks | OPEN | Performance and maintainability work remains. |

### Current verification baseline

- Backend: `go test ./...` passes.
- Frontend: full suite passes (1,712 tests), ESLint passes, typecheck passes, and production build passes.
- Production dependency audit: **0 critical, 0 high, 8 moderate, 1 low**.
- Remaining production advisories are transitive Mermaid advisories through the LobeHub icon/UI dependency chain.
- No xlsx dependency, source reference, advisory, or xlsx exception remains.

## 1. 审计范围

排除 Ent 自动生成代码后，主要规模如下：

| 范围 | 文件数 | 约 LOC |
|---|---:|---:|
| 后端生产代码（`backend/internal`、`backend/cmd`） | 950 | 334,840 |
| 后端测试代码 | 1,173 | 319,448 |
| 前端代码（TS/Vue/JS） | 751 | 213,108 |

重点覆盖：

- 首次安装、认证、JWT、Refresh Token、TOTP/Passkey/OAuth
- 管理员/API Key 权限、路由保护、用户资源归属
- 支付、Webhook、订单恢复、插件上传与执行
- SSRF、路径穿越、命令执行、SQL 拼接、日志脱敏、文件上传
- 前端路由、Token 管理、`v-html`、URL 清洗、功能开关
- Docker、Compose、CI、pnpm/Go 依赖与供应链

## 2. 总体结论

The initial audit identified three release-blocking findings. All three are now resolved on `main`: protected first-run setup, atomic refresh-token rotation, and reproducible pnpm installs.

The current release baseline has complete backend/frontend test coverage passing and no critical/high production dependency advisories. Remaining open work is limited to cookie-backed browser refresh sessions, compatibility-preserving URL security profiles, and frontend bundle/component decomposition.

## 3. 发现清单

### A-01 [RESOLVED] [严重/Critical] 首次安装接口可被远程抢占，并提供未认证内网探测能力

**位置：**

- `backend/cmd/server/main.go:97-126`
- `backend/cmd/server/main.go:113`
- `backend/internal/config/config.go:3744-3761`
- `backend/internal/setup/handler.go:22-35`
- `backend/internal/setup/handler.go:54-64`
- `backend/internal/setup/handler.go:127`
- `backend/internal/setup/handler.go:188`
- `backend/internal/setup/handler.go:240`

**问题：**

当 `NeedsSetup()` 为真且未启用自动安装时，程序启动 Web 安装向导。默认地址来自 `GetServerAddress()`，其默认主机为 `0.0.0.0`。安装修改接口只检查“系统尚未安装”，没有安装口令、来源限制或本机限制：

- `POST /setup/test-db`
- `POST /setup/test-redis`
- `POST /setup/install`

直接 HTTP 客户端不受浏览器 CORS 限制。攻击者可在管理员完成安装前：

- 提交自己的数据库、Redis 和管理员账户配置，抢占实例；
- 利用数据库/Redis测试接口探测应用网络可达的内网地址和端口；
- 使实例连接到攻击者控制的依赖服务。

**适用条件：**仅影响“尚未安装、AUTO_SETUP 未启用、端口可从不可信网络访问”的窗口；但该窗口通常正是新部署最脆弱的阶段。

**修复建议：**

1. 安装模式默认强制绑定 `127.0.0.1`/`::1`，远程安装必须显式开启。
2. 启动时生成高强度一次性 bootstrap token，只打印到控制台，所有修改接口必须携带。
3. token 使用后立即作废，并给安装模式设置超时。
4. `test-db`/`test-redis` 增加速率限制；远程安装模式下禁止访问 loopback、link-local、云元数据和私网网段，或要求显式 allowlist。
5. 反向代理部署时，在代理层也禁止公开 `/setup/*`。

---

### A-02 [RESOLVED] [高/High] Refresh Token 轮转不是原子操作，可被并发重复消费

**位置：**

- `backend/internal/service/auth_service.go:1779-1861`
- `backend/internal/service/auth_service.go:1793`
- `backend/internal/service/auth_service.go:1848-1855`
- `backend/internal/service/refresh_token_cache.go:30-68`
- `backend/internal/repository/refresh_token_cache.go:52-70`

**问题：**

刷新流程是分离的：

1. Redis `GET` 读取 refresh token；
2. 校验用户与会话；
3. Redis `DEL` 删除旧 token；
4. 生成并存储新 token。

两个并发请求可以同时在删除前读到同一个旧 token，随后各自签发新的 token 对。前端虽然在同一文档内合并刷新请求，但无法覆盖多标签页、多个实例、不同设备或攻击者并发请求。

同时，旧 token 删除失败时当前实现只记录日志并继续签发新 token，属于安全状态变更的 fail-open。若后续再次发现 token 不存在，代码仅记录“possible reuse attack”，没有可用 family 信息来撤销整个 family。

**影响：**

- 被窃取的 refresh token 可通过竞态维持并行会话；
- Redis 部分故障时旧 token 可能继续有效；
- 当前“token family 防重放”设计没有真正完成闭环。

**修复建议：**

1. 在 Redis 中使用 Lua 脚本或事务实现原子 `consume`：读取、校验存在、删除/标记已消费一次完成。
2. 旧 token 消费失败必须 fail-closed，不得签发新 token。
3. 保存短期 tombstone（包含 family ID）；再次使用旧 token 时撤销整个 family。
4. 增加并发测试：数十个 goroutine 同时刷新同一 token，只允许一个成功。
5. 新 token 的存储与旧 token 消费应设计失败补偿，避免产生无主或双活 token。

---

### A-03 [RESOLVED] [高/发布阻断] pnpm 版本、workspace 配置和锁文件不一致

**位置：**

- `frontend/pnpm-workspace.yaml:1-3`
- `frontend/package.json:62-67`
- `frontend/pnpm-lock.yaml:1-6`
- `.github/workflows/backend-ci.yml:42-59`
- `Dockerfile:28-35`

**复现结果：**

- CI 和 Docker 固定 pnpm 9。
- 当前 `pnpm-workspace.yaml` 只有 pnpm 10 风格的 `allowBuilds`，没有 pnpm 9 要求的 `packages`，pnpm 9 报 `packages field missing or empty`。
- 使用 pnpm 10 执行 `pnpm install --frozen-lockfile` 又报：`ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`。
- 原因是 `package.json` 中新增/修改了 `pnpm.overrides`，但锁文件 settings 没同步。

**影响：**

- GitHub CI 的前端 job 在安装阶段失败；
- Docker 多阶段构建在前端依赖安装阶段失败；
- 本地开发者只能绕过锁文件安装，得到与发布锁文件不同的依赖树。

**修复建议：**

1. 统一并显式声明 pnpm 版本，例如在 `package.json` 添加 `packageManager`。
2. 若采用 pnpm 10：CI、Docker、开发文档全部升级到同一精确版本，并补充合法 workspace `packages`。
3. 若继续 pnpm 9：移除/改写 pnpm 10 专属 workspace 配置。
4. 使用目标 pnpm 版本执行 `pnpm install --lockfile-only`，提交同步后的锁文件。
5. 在 CI 增加“锁文件未发生变化”的校验。

---

### A-04 [RESOLVED] [中/Medium] Windows 上插件安装稳定失败

**位置：**

- `backend/internal/service/plugin_package.go:106-110`
- `backend/internal/service/plugin_package.go:137-149`

**问题：**

插件包通过 `zip.OpenReader(tempPath)` 打开，并使用 defer 到函数退出时才关闭；但在 archive 仍打开时，代码在第 146 行执行 `os.Rename(tempPath, artifactPath)`。

Unix 通常允许重命名已打开文件，Windows 会因文件句柄占用拒绝重命名。

**实测：**以下 4 个测试稳定失败，错误均为 “The process cannot access the file because it is being used by another process”：

- `TestPluginPackageInstallerInstallUnsignedDevelopmentPackage`
- `TestPluginPackageInstallerAllowsRepeatedIdenticalUpload`
- `TestPluginPackageInstallerVerifiesTrustedSignature`
- `TestPluginPackageInstallerKeepsHostVersionMismatchDisabled`

**修复建议：**在完成 archive 检查和解压后、重命名上传文件前显式关闭 archive；处理关闭错误，并避免仅依赖 defer。

---

### A-05 [RESOLVED-BROWSER] [中/Medium] Access Token 与 Refresh Token 均长期存放在 localStorage


**Current status:** browser refresh sessions now use a rotating HttpOnly, SameSite=Lax cookie. The browser no longer persists newly issued refresh tokens; existing localStorage sessions migrate after their next successful refresh. JSON refresh tokens remain in responses and requests for non-browser client compatibility.

**位置：**

- `frontend/src/api/auth.ts:71-105`
- `frontend/src/api/auth.ts:75`
- `frontend/src/api/auth.ts:82`
- `frontend/src/stores/auth.ts`

**问题：**

access token 和 refresh token 均可被同源 JavaScript 直接读取。任何前端 XSS、被污染的第三方脚本、恶意浏览器扩展或供应链注入，都可直接窃取长期 refresh token。

**修复建议：**

- refresh token 改为后端设置的 `HttpOnly + Secure + SameSite` Cookie；
- access token 尽量只存内存，并缩短有效期；
- refresh 接口增加 CSRF 防护或严格 SameSite/Origin 校验；
- Token 轮转修复应与 A-02 一并完成。

---

### A-06 [RESOLVED] [中/Medium] 首页自定义 HTML 未经过清洗，扩大 Token 存储风险

**位置：**

- `frontend/src/views/HomeView.vue:3-12`
- `frontend/src/views/HomeView.vue:496-500`

**问题：**

`home_content` 非 URL 时直接进入 `v-html`，没有使用 DOMPurify。项目其他 Markdown/公告/法律文档渲染点普遍进行了 DOMPurify 清洗，此处形成不一致的信任边界。

该字段看起来是管理员可配置的“自定义首页”，可能有意允许 HTML，但当前实现至少允许任意表单、链接、覆盖式 UI 和 HTML 注入；若未来 CSP 被弱化、出现可利用 DOM gadget 或配置写权限被突破，将与 localStorage token 组合成高影响攻击链。

**修复建议：**

- 默认使用严格 DOMPurify allowlist；
- 若确实需要“完全可信 HTML”，单独增加危险模式开关和醒目警告；
- 自定义页面最好放入 sandbox iframe，使用独立 origin；
- 禁止表单提交、导航、脚本和同源访问能力。

---

### A-07 [RESOLVED] [中/功能回归] Affiliate 开启时注册页缺少可手工输入的可选邀请码字段

**位置：**

- `frontend/src/views/auth/RegisterView.vue:345-346`
- `frontend/src/views/auth/RegisterView.vue:480-481`
- `frontend/src/views/auth/RegisterView.vue:90-162`
- `frontend/src/views/auth/__tests__/RegisterView.spec.ts:93-106`

**问题：**

代码读取了 `affiliate_enabled` 并保存到 `affiliateEnabled`，但模板没有使用该状态渲染 `affiliate_code` 输入框。当前只会从 URL/本地 referral 状态获取 `aff_code`。

当 affiliate 开启、强制 invitation 关闭时，用户无法在注册页手工输入推荐码。对应回归测试失败。

**修复建议：**恢复可选 `affiliate_code` 字段；当强制 invitation 开启时避免重复显示；提交时统一映射到 `aff_code`。

---

### A-08 [OPEN] [中/Medium] 示例和默认配置关闭 SSRF allowlist，并允许私网与 HTTP

**位置：**

- `config.yaml:136-165`
- `deploy/config.example.yaml:136-165`

**默认值：**

- `security.url_allowlist.enabled: false`
- `allow_private_hosts: true`
- `allow_insecure_http: true`

**问题：**

项目已有 URL validator 和 DNS 解析后 IP 校验能力，但示例生产配置默认关闭了核心约束。管理员配置上游、定价、同步或探测 URL 时，更容易误连内网、云元数据地址或明文 HTTP 服务。

管理员本身是高权限角色，因此这通常不是直接的低权限 SSRF；但它显著放大管理员会话被盗、错误配置和恶意插件/导入数据的影响。

**修复建议：**生产示例改为 allowlist 开启、私网关闭、HTTP 关闭；需要私网模型服务的部署再按目标 host 显式放行。

---

### A-09 [RESOLVED-XLSX] [中/供应链] 前端存在已知漏洞依赖；生产主要为 xlsx，开发工具链另有高危项

**Current status:** `xlsx` has been removed and Usage export now produces formula-safe UTF-8 CSV. The refreshed production audit contains 0 critical/high findings; the remaining 8 moderate and 1 low findings are transitive Mermaid advisories.

**位置：**

- `frontend/package.json:36`
- `frontend/src/views/admin/UsageView.vue:575-619`
- `.github/audit-exceptions.yml:3-16`

**审计结果：**

`pnpm audit --prod`：

- high: 2
- moderate: 18
- low: 5

两个 high 均为直接依赖 `xlsx@0.18.5`：Prototype Pollution 与 ReDoS。当前只用于管理员导出、不读取任意上传文件，实际可利用性较低；仓库已有有效至 **2026-10-06** 的例外记录。

完整依赖审计还发现开发工具链的 Vitest/Vite 等高危或严重公告。Vitest UI 服务若监听不可信接口，风险明显；普通一次性 `vitest run` 风险较低。

**修复建议：**

- 评估移除 `xlsx`，改用维护中的导出库或 CSV；
- 例外到期前完成替换，避免长期豁免；
- 升级 Vitest/Vite/ESLint 工具链；
- 禁止开发服务器、Vitest UI 暴露到公网。

后端 `govulncheck` 结果：当前调用路径未发现可达漏洞；依赖模块中有 10 个已知公告，但扫描认为当前代码未调用对应易受影响符号。

---

### A-10 [RESOLVED] [中/质量门禁] CI 只运行 165 个“关键前端测试”，完整测试的 11 个失败不会阻止合并

**位置：**

- `Makefile:3-17`
- `Makefile:36-41`
- `.github/workflows/backend-ci.yml:60-62`

**实测：**

- CI 关键测试：165/165 通过；
- 完整前端测试：1700 项中 1689 通过、11 失败；
- 失败涉及首页、注册页、Prompt Audit 侧边栏、AccountsView 和 GroupsView。

其中有一部分属于脆弱的源码字符串/样式快照测试，当前代码行为实际上正确；但 Affiliate 字段和模型广场入口确有功能回归。选择性测试使这些问题不会进入 CI 红灯。

**修复建议：**CI 至少增加每日或 PR 全量 Vitest；对脆弱的 `readFileSync(...).toContain(...)` 测试改为组件行为测试。

---

### A-11 [RESOLVED] [低/Low] 首页模型广场入口未遵循 require-auth 展示规则

**位置：**

- `frontend/src/views/HomeView.vue:44-51`
- `frontend/src/views/HomeView.vue:142-148`
- `frontend/src/views/HomeView.vue:493`
- `frontend/src/router/index.ts:853-855`

**问题：**

首页只检查 `model_plaza_enabled`，没有检查 `model_plaza_require_auth`。匿名用户仍看到入口，点击后才由路由守卫跳登录页。

后端和路由守卫仍会阻止匿名读取，因此不是权限绕过，但属于功能开关语义不一致和用户体验回归。

**修复建议：**入口条件改为：功能开启，并且“不要求登录或当前已登录”。

---

### A-12 [RESOLVED] [低/Low] 内容审核缓存测试依赖 1ns TTL，在 Windows 时钟分辨率下稳定失败

**位置：**

- `backend/internal/service/content_moderation_runtime_cache_test.go:263-282`
- `backend/internal/service/content_moderation.go:1512-1556`

**问题：**

测试使用 `time.Nanosecond` 期望下一次调用立即过期；Windows `time.Now()` 的有效分辨率可能无法保证两个调用之间超过 1ns，导致后台刷新未触发。定向重复执行仍失败。

另一个测试已经采用手工回拨 `loadedAt` 的方式，更稳定。

**修复建议：**不要使用 1ns 依赖真实时钟；注入 clock，或直接将快照 `loadedAt` 设置为过去时间。

---

### A-13 [OPEN] [低/性能与维护性] 前端存在超大组件和超大 chunk

**证据：**

- `AccountsView.vue`、`SettingsView.vue`、`GroupsView.vue` 等文件体积很大；
- 构建产物中 `AccountsView` chunk 约 744 KB；
- Vite 报告存在超过 500 KB 的 chunk；
- 整体 dist 约 5.9 MB（未压缩总量）。

**影响：**首屏/后台路由加载、缓存失效成本、评审难度和回归概率均上升。此次多个样式回归测试失败也与超大单文件耦合有关。

**修复建议：**按业务区域拆分组件、表单 schema、弹窗和 composable；对图标库和 UI 依赖做按需导入；重新规划 manualChunks。

## 4. 自动化验证结果

| 检查 | 结果 |
|---|---|
| 前端 ESLint | 通过 |
| 前端 TypeScript typecheck | 通过 |
| 前端生产构建 | 通过，但有大 chunk 警告 |
| 前端 CI 关键测试 | 165/165 通过 |
| Frontend full test suite | 1,711/1,711 passed |
| pnpm 9 frozen 安装 | 失败：workspace 配置不兼容 |
| pnpm 10 frozen 安装 | 失败：overrides 与 lockfile 不一致 |
| 后端 `go vet ./...`（amd64） | 通过 |
| Backend full test suite (amd64) | Passed |
| Windows 插件安装定向测试 | 4/4 稳定失败 |
| 内容审核缓存定向测试 | 稳定失败，属于时钟分辨率测试问题 |
| 后端 `govulncheck` | 0 个当前调用路径可达漏洞 |
| 后端 race test | 当前 Go 环境 CGO 关闭，未执行 |
| Integration test | Docker daemon 不可用，未执行 |
| embed 最终链接 | 本机安装的是 32 位 Go 工具链，链接器内存不足；`cmd/server` 在测试阶段已成功编译 |

## 5. 已确认的正向安全措施

- JWT 使用 HMAC 并限制有效算法；access token 有 exp/nbf。
- 密码使用 bcrypt。
- 用户状态与 TokenVersion 在 JWT 中间件中重新从数据库校验。
- 管理员敏感操作具备 TOTP step-up，并拒绝 admin API key 访问部分高风险接口。
- API Key 查询参数已拒绝，避免 URL/日志泄漏。
- 插件默认要求 Ed25519 签名，包含 ZIP 路径穿越、符号链接、文件数和解压大小限制。
- 自定义页面图片路径包含多层 clean/Rel/EvalSymlinks 防护。
- CORS 不允许 `*` 与 credentials 同时启用。
- CSP nonce、响应头过滤、日志脱敏、请求体/请求头大小限制均有实现。
- 代码扫描未发现当前快照中明显的真实硬编码生产密钥。

## 6. 建议修复顺序

### P0：发布前必须完成

1. A-01 首次安装加 bootstrap token，并默认仅监听本机。
2. A-02 Refresh Token 改为 Redis 原子消费与 family 重放撤销。
3. A-03 统一 pnpm 版本并重建 lockfile，恢复 CI/Docker frozen install。

### P1：近期完成

4. A-04 修复 Windows 插件安装。
5. A-05/A-06 调整 Token 存储与自定义 HTML 信任边界。
6. A-07 恢复 Affiliate 注册字段。
7. A-08 收紧生产 URL/SSRF 默认值。
8. A-09 升级/替换依赖。

### P2：工程治理

9. A-10 全量测试进入 CI。
10. A-11/A-12 修复前端展示与跨平台测试。
11. A-13 拆分大型前端组件和 chunk。

## 7. 建议新增的关键回归测试

1. 未提供 bootstrap token 时所有 `/setup` 修改接口返回 401/403。
2. 安装服务默认只监听 loopback。
3. 50 个并发 refresh 请求只能一个成功，其余触发重放处理。
4. Redis 删除/消费失败时不得签发新 token。
5. Windows 插件包安装、重复上传、签名验证测试。
6. Affiliate 开启/关闭与 invitation 开启/关闭的 4 组合注册测试。
7. 匿名首页在 `model_plaza_require_auth=true` 时不显示入口。
8. 自定义首页恶意 HTML 清洗测试。
9. CI 使用目标 pnpm 版本执行 frozen install，并验证 lockfile 无变化。
