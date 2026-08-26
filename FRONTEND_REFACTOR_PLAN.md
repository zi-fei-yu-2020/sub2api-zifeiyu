# 前端重构与审计计划

更新日期：2026-08-26  
当前基线提交：`d703a5651`

## 一、当前可验证基线

- `SettingsView.vue`：7,784 个物理行（7352 个非空行）；Codex 拆分从 8,016 行减少 232 行，项目最初约 12,449 行。
- `AccountsView.vue`：104,039 字节；当前生产 chunk 为 743,846 字节（约 726.4 KiB）。
- `GroupsView.vue`：267,372 字节。
- 前端测试文件：267 个。
- 全量 Vitest：1,811 / 1,811 通过。
- TypeScript typecheck：通过。
- ESLint：通过。
- 生产构建：通过。
- `pnpm install --frozen-lockfile`：通过。
- `pnpm audit --prod`：info / low / moderate / high / critical 均为 0。
- 本地前端：`http://127.0.0.1:3000`，Vite watcher 显示 0 个类型错误。

## 二、已经完成

### 2.1 SettingsView 面板拆分

已经提取并验证以下面板：

- `AdminApiKeySettingsPanel`
- `OverloadCooldownSettingsPanel`
- `RateLimit429CooldownSettingsPanel`
- `StreamTimeoutSettingsPanel`
- `RequestRectifierSettingsPanel`
- `BetaPolicySettingsPanel`
- `OpenAIFastPolicySettingsPanel`
- `ApiKeyAclSettingsPanel`
- `PanelRateLimitSettingsPanel`
- `CaptchaSettingsPanel`
- `LinuxDoConnectSettingsPanel`
- `GitHubOAuthSettingsPanel`
- `GoogleOAuthSettingsPanel`
- `WeChatConnectSettingsPanel`
- `DingTalkConnectSettingsPanel`
- `OIDCSettingsPanel`
- `RegistrationSecuritySettingsPanel`
- `DefaultUserSettingsPanel`

每个已拆面板均完成：

- 拆分前后 DOM 顺序和元素数量核对
- class、关键属性和显示条件等价检查
- 独立组件测试
- `SettingsView` 父级保存 payload 契约测试
- 全量 Vitest、TypeScript、ESLint 和生产构建
- Registration 面板模板结构保持 83 个元素、10 个 Toggle、13 个 v-model 完全等价
- Registration 拆分后 Settings chunk 为 411,509 字节，较拆分前增加 994 字节（约 0.24%）
- Default User 面板结构保持 137 个元素、13 个 input、18 个 v-model 完全等价
- Default User 拆分后 Settings chunk 为 412,799 字节，较上一步增加 1,290 字节（约 0.31%）

### 2.2 构建与依赖安全基线

已经完成：

- 修复 pnpm overrides 与锁文件不一致，恢复 frozen install。
- 移除未使用的 `xlsx` 及其完整依赖闭包，改为保留现有 CSV 路径。
- 移除未使用的 `@lobehub/icons → @lobehub/ui → Mermaid` 依赖链。
- 清除由 LobeHub 链带入的 React、React DOM、Ant Design、Mermaid 等 531 个安装包。
- 刷新 `frontend/audit.json`，当前依赖安全公告为 0。
- 清空已失效或不再匹配公告的审计例外。

### 2.3 远程同步后的回归修复

已经恢复：

- 登录、注册输入框图标安全间距。
- 模型广场长上下文提示和高峰配置传递契约。
- Accounts 优先级列默认可见和排序行为。
- 代理批量导入的方括号 IPv6 支持。
- 用户并发 `0 = 不限制`、负数拒绝的统一契约。
- 全量测试从 12 个失败恢复，并在持续新增面板测试后达到 1,807 / 1,807 通过。

## 三、下一阶段：SettingsView 业务面板

`RegistrationSecuritySettingsPanel`、`DefaultUserSettingsPanel` 和 `SiteSettingsPanel` 已完成。SettingsView 业务面板阶段结束。

## 四、后续阶段：Gateway 面板

`ClaudeCodeSettingsPanel` 已完成，结构保持 13 个元素、2 个 input、2 个 v-model 完全等价；Settings chunk 为 413,836 字节，较上一步增加 170 字节。

`CodexSettingsPanel` 已完成，结构保持 52 个元素、9 个 input、6 个 button、11 个 v-model 完全等价；Settings chunk 为 414,906 字节，较上一步增加 1,070 字节。

UpstreamBillingProbeSettingsPanel 已完成；Settings chunk 为 415,567 字节，较上一步增加 661 字节。

剩余按独立职责拆分：

1. `OllamaCloudUsageSettingsPanel`
2. `GatewaySchedulingSettingsPanel`
3. `UsageRecordsSettingsPanel`

## 五、性能优化阶段

### 5.1 AccountsView 按需加载

目标：将当前 743,846 字节的 Accounts 路由 chunk 降至 500 KiB 以下。

优先拆分：

- 非首屏弹窗
- 平台专用创建和编辑表单
- 测试、统计、重新认证、批量编辑等管理弹窗
- 只在特定平台使用的配额组件

验收：

- 首屏功能和布局不变
- 弹窗首次打开、关闭和再次打开行为正常
- 异步加载失败有明确反馈
- chunk 体积有构建前后对比

### 5.2 Settings Tab 异步加载

在业务面板拆分稳定后评估：

- Tab 级动态导入
- 使用 `KeepAlive` 保留未保存表单状态
- 验证 Tab 切换、保存、错误恢复和首次加载时机
- 禁止为了缩小 chunk 改变现有页面布局

### 5.3 GroupsView 拆分

拆分范围：

- 分组列表
- 创建和编辑表单
- 模型定价
- 模型映射
- 组合组配置
- 相关弹窗和辅助逻辑

## 六、每项改造的强制验收门槛

任何拆分或依赖调整都必须完成：

1. 记录改造前后文件规模和构建 chunk。
2. 对比 DOM 顺序、元素数量、class、关键属性和显示条件。
3. 补充组件级回归测试。
4. 补充父级事件、保存 payload 或路由契约测试。
5. 执行 `pnpm install --frozen-lockfile`。
6. 执行完整 Vitest。
7. 执行 TypeScript typecheck。
8. 执行完整 ESLint。
9. 执行生产构建。
10. 对主要页面进行浏览器冒烟检查。
11. 保持现有蓝白 SaaS 风格和响应式布局不变。

## 七、最终审计收尾

全部重构完成后：

- 恢复或重新生成 `CODE_AUDIT_REPORT_2026-08-25.md`。
- 更新 A-13 大型前端组件风险状态。
- 记录 Settings、Accounts、Groups 的拆分前后数据。
- 记录最终依赖审计、测试、构建和浏览器冒烟结果。
- 确认审计例外为空或每条例外均有有效期限和可验证缓解措施。

## 八、建议执行顺序

1. 六个 Gateway 面板
3. AccountsView 按需加载
4. GroupsView 拆分
5. Settings Tab 异步加载
6. 最终 A-13 审计报告
