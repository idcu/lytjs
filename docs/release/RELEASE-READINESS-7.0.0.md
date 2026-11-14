# LytJS 7.0.0 发布就绪单

> 状态：**就绪待 owner 放行**。本页生成时 HEAD `08e91a5b`（含 changeset 补漏）。
> **未执行**：`changeset version` 落盘、打 tag、`npm publish`。
> 发布唯一入口是 `node scripts/release.mjs`（默认 dry-run，见 §3）。

## 1. 版本号

- 发布集 **76** 个包，`6.9.6 → 7.0.0`（major，由 `v7-core-hardening` 等 14 个 changeset 驱动）。
- 根 `package.json` 与 `docs` / `playground` / `benchmarks/.../lytjs-npm` / `examples/*`
  均不在 changesets 发布集，不参与升版。
- 发布集派生唯一真源：`scripts/release-set.mjs`（workspace globs + changeset ignore + private）。
  当前口径：工作区 82 包 / 发布集 76 / 配套工程 6（全部 `private: true`）。

## 2. changeset 消费方式

配置见 `.changeset/config.json`：

- `baseBranch: "v7.0.0-dev"`、`access: "public"`、`ignore: []`
- `updateInternalDependencies: "patch"`、`bumpVersionsWithWorkspaceProtocolOnly: true`
- `changelog: "@changesets/cli/changelog"`
- 待消费 changeset：**15 个**（`.changeset/*.md`，不含 README；含 `v7-release-surface-cleanup` 补漏）。

命令：

| 目的                                      | 命令                                                         |
| ----------------------------------------- | ------------------------------------------------------------ |
| 写 changeset                              | `pnpm changeset`                                             |
| 干看目标版本                              | `pnpm changeset status --verbose`                            |
| 消费 changeset（升版 + CHANGELOG）        | `pnpm version`（= `changeset version`）                      |
| 发布（全流程，含 build / gate / publish） | `node scripts/release.mjs`（默认 dry-run；`--execute` 真跑） |

## 3. 发布命令序列

> ⚠️ 当前唯一远端是 `gitee.com:lytjs/lytjs.git`，`.github/workflows/release.yml`
> 在本远端**不会触发**（文件头带 `[no-ci-release]`，由 `check-release-workflow` 守卫）。
> 发布走本地脚本，步骤如下；脚本任一步失败即停。

```bash
pnpm install --frozen-lockfile
node scripts/release.mjs              # dry-run：git / npm 前置核对 + 命令序列
node scripts/release.mjs --execute --otp 123456   # 真跑（账号要求写操作 2FA 时 --otp 必填）
npm view @lytjs/core version          # 期望 7.0.0
```

脚本固定步骤：`changeset version` → `pnpm build` → fast 档 → slow 档 →
逐包 `pnpm pack` 并核对 tarball = 76 → 逐包 `npm publish <tgz>` → `git tag v7.0.0` → push tag。

**发布前拒绝执行的条件**（任一命中即停）：

- git：工作树不干净（断点续跑时放宽）、`@{u}..HEAD` 非空、落后远端；
- npm：`whoami` 失败；所有查询与发布都显式 `--registry https://registry.npmjs.org/`，
  不读本机 `.npmrc`（镜像是缓存，会把「7.0.0 未占用」查成假绿；也无需改全局配置）；
- npm：76 个包中任一 `7.0.0` 已存在（整体中止并列出包名），或线上查询失败无法判定；
- 2FA：账号为 `auth-and-writes` 但未提供 `--otp`。

**owner 侧前置（脚本无法代办）**：

- `npm login` 走本地凭据，**不要把 token 写进脚本参数或环境变量后贴进日志**；
- 无需切全局 registry：脚本每条 npm 命令都显式 `--registry https://registry.npmjs.org/`。

**线上事实（2026-11-14 实测，官方源）**：

- 发布集 76 包：**73 个已存在，latest 全部为 6.9.6**；`@lytjs/config`、`@lytjs/di`、
  `@lytjs/plugin` **从未发布**（7.0.0 即首次发布，无升级用户）；
- `@lytjs` scope 另有 **25 个 5.0.1 遗留包**（`@lytjs/lytjs`、`@lytjs/plugins`、`@lytjs/components`、
  `plugin-*` 等）不在发布集内，7.0.0 不会更新它们 —— 发布公告不要暗示「全 scope 同步升版」；
- 迁移指南基线成立：用户起点就是 6.9.6，不需要写跨版本迁移。

**幂等与断点续跑**：publish 前逐包比对 `dist.integrity` 与本地 tgz 的 sha512，
一致则跳过、不一致则中止；已完成/跳过记录写入 `.release-progress.json`，
重跑从断点继续，任一包失败立即停并打印已完成 / 未完成清单。

发布凭据只走环境变量 `NPM_TOKEN` / `NODE_AUTH_TOKEN`，不得写入 `.npmrc` 或仓库文档。

## 4. 失败回滚方式

**tag 只在 76 个包全部 publish 成功后创建**（脚本按步骤顺序执行，publish 未完成不会进 tag 步骤）。
因此「半发布」的残局**没有 tag 可删**，回滚手段也不是删 tag。

| 阶段                       | 处理                                                                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| version 落盘后、publish 前 | `git checkout -- .` 丢弃本地改动即可（未提交、未发布）；若已建 tag，`git tag -d v7.0.0`                                                            |
| publish 部分成功（无 tag） | 保留 `.release-progress.json`，修好后 `--execute` 续跑；integrity 一致的包自动跳过，不一致则中止                                                   |
| 全部发布成功但随后发现缺陷 | **回滚 = 发 7.0.1**，不是删 tag。删 tag 不改变 npm 上已发布的 76 个包                                                                              |
| 必须撤某个包               | `npm unpublish <pkg>@7.0.0` 仅限发布后 **72 小时内**；有 dependents 的包无法撤；同一版本号撤下后 **24 小时内不能重新发布**；默认不发撤包，走 patch |

「回滚」在 npm 语义下不等于撤销：已安装 7.0.0 的用户不会因为删 tag 或撤包而回退。
发布公告与故障说明里必须写明「修复版本号」，不要让读者以为有原子回滚。

## 5. 已知延期项

### 批次 2（4 条，均有 workaround，不占发布窗口）

| 编号         | 位置                                                            | 影响                                                                            | workaround                |
| ------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------- |
| 运行时 P1-6  | `packages/vdom/src/patch.ts:641-693`                            | 卸载后仍持有 vnode 时复用旧 `el` 捷径，可能 patch 到错误节点                    | 卸载尾部清 `el/component` |
| 编译器 C-32  | `packages/compiler/src/sfc/script-setup.ts:340-362`             | `<script setup>` 顶层 `let` 直接进模板不触发更新                                | 用 `ref` / `reactive`     |
| 编译器 C-34  | `packages/compiler/src/client-server-boundary/index.ts:409-494` | client-server 切分两份产物都内联完整源码，收益为 0                              | 手工拆分                  |
| 运行时 P1-12 | `packages/reactivity/src/batch.ts:143-176`                      | `batchScope(async () => 1, { async: true })` 类型声明返回 `T`，运行时是 Promise | 用 `batchScopeAsync`      |

### fixture 硬编码 `^6.9.6`（10 处，非发布阻断）

- `packages/tools/packages/cli/src/commands/create.ts:127,151,167,172,175,180`（6 处模板依赖）
- `packages/tools/packages/cli/src/commands/run.ts:25`（`FALLBACK_VERSION`）
- `packages/tools/packages/cli/tests/scaffold-output.test.ts:80`（1 处断言）
- `packages/tools/packages/cli/tests/template-validity.test.ts:62,73`（2 处断言）

影响：7.0.0 发布后 CLI 脚手架仍生成 `^6.9.6` 依赖。不阻断发布，但需在下个 patch 前改为
从 `package.json` 读取当前版本（或同步升到 `^7.0.0`）。

## 6. 未执行声明

- 未运行 `changeset version` 落盘（此前仅隔离 worktree 干跑）。
- 未创建 `v7.0.0` tag。
- 未执行 `npm publish`。
- 发布动作等 owner 明确放行。
