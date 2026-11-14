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
node scripts/release.mjs              # dry-run：打印 HEAD / @{u}..HEAD / 工作树与命令序列
node scripts/release.mjs --execute    # 真跑：version → build → fast → slow → pack 76 → publish → tag → push
npm view @lytjs/core version          # 期望 7.0.0
```

脚本固定步骤：`changeset version` → `pnpm build` → fast 档 → slow 档 →
逐包 `npm pack` 并核对 tarball = 76 → 逐包 `npm publish <tgz>` → `git tag v7.0.0` → push tag。
实跑前若 HEAD 之外有未推送提交、落后远端或工作树不干净，**直接拒绝**。

发布凭据只走环境变量 `NPM_TOKEN` / `NODE_AUTH_TOKEN`，不得写入 `.npmrc` 或仓库文档。

## 4. 失败回滚方式

| 阶段                       | 处理                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| version 提交后、publish 前 | `git revert <version-commit>`（不 `reset --hard`）；若已建 tag，`git tag -d v7.0.0`                                     |
| publish 部分成功           | 逐包 `npm publish` 非原子：脚本失败即停；修复后用 `npm publish <tgz>` 补齐未发包，已发出去的包**不回滚**，发 patch 修复 |
| 已 push tag                | `git tag -d v7.0.0 && git push origin :refs/tags/v7.0.0`（先确认 npm 端已处理）                                         |
| npm 撤包                   | 仅 72h 内且无 dependents 可 `npm unpublish`；默认不发撤包，走 patch                                                     |

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
