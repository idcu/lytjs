# LytJS 7.0.0 发布就绪单

> 状态：**就绪待 owner 放行**。本页生成时 HEAD `54f6e99d`（含 changeset 补漏与发布脚本）。
> **未执行**：`changeset version` 落盘、打 tag、`npm publish`。
> 发布唯一入口是 `node scripts/release.mjs`（默认 dry-run，见 §3）。

## 1. 版本号

- 发布集 **76** 个包（打包与发布对象），`6.9.6 → 7.0.0`（major，由 `v7-core-hardening` 等 14 个 changeset 驱动）。
- `changeset version` 实际会改 **78** 个 `package.json` + **78** 份 `CHANGELOG.md`：
  76 个发布集包 + 2 个 `private` 工作区包（`lytjs-npm`、`@lytjs/playground`；changesets 默认
  `privatePackages.version: true`）。后两者只升版、不发布，打包与 publish 仍只覆盖 76。
- 根 `package.json`、`docs`、`examples/*` 不在 `changeset status` 的 releases 中，不会升版。
- 发布集派生唯一真源：`scripts/release-set.mjs`（workspace globs + changeset ignore + private）。
  当前口径：工作区 82 包 / 发布集 76 / 配套工程 6（全部 `private: true`）。

### 1.1 三个数量口径（不要混用）

| 对象                          | 数量              | 含义                                                                      |
| ----------------------------- | ----------------- | ------------------------------------------------------------------------- |
| 升版（`changeset version`）   | **78**            | 76 个发布集包 + 2 个 private 工作区包（`lytjs-npm`、`@lytjs/playground`） |
| 打包 / 发布（pack / publish） | **76**            | 仅发布集；private 不 `pnpm pack`、不 `npm publish`                        |
| tag                           | **1** 个 `v7.0.0` | 仅在 76 个发布包全部 publish 成功后创建；private 不打 tag                 |

`privatePackages: { version: true, tag: false }` 的含义（`.changeset/config.json` 未显式写，取默认值）：
private 包**会被改写版本号与 CHANGELOG**，但**不发布、不打 tag**。因此「升版 78 / 发布 76」不是矛盾，
而是两个不同对象；核对 tarball 时只认 76。

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
- npm：76 个发布包中任一 `7.0.0` 已存在（整体中止并列出包名），或线上查询失败无法判定；
- 2FA：账号为 `auth-and-writes` 但未提供 `--otp`。

**owner 侧前置（脚本无法代办）**：

- `npm login` 走本地凭据，**不要把 token 写进脚本参数或环境变量后贴进日志**；
- 无需切全局 registry：脚本每条 npm 命令都显式 `--registry https://registry.npmjs.org/`。

**发布前必修（顺序固定）**：`@lytjs/ui` 的运行时版本已改为 tsup 构建期注入（见 §7）。
`changeset version` 之后必须重新构建，注入值才会随 `package.json` 更新；脚本现有
`changeset version → build` 顺序已满足，不要调换。

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

**tag 只在 76 个发布包全部 publish 成功后创建**（脚本按步骤顺序执行，publish 未完成不会进 tag 步骤）。
因此「半发布」的残局**没有 tag 可删**，回滚手段也不是删 tag。

| 阶段                       | 处理                                                                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| version 落盘后、publish 前 | 选路径 B（见 4.1）：留档后 `git checkout -- .`，删除 `.release-progress.json`，再重来；未发布、未建 tag                                            |
| publish 部分成功（无 tag） | 保留 `.release-progress.json`，修好后 `--execute` 续跑；integrity 一致的包自动跳过，不一致则中止                                                   |
| 全部发布成功但随后发现缺陷 | **回滚 = 发 7.0.1**，不是删 tag。删 tag 不改变 npm 上已发布的 76 个包                                                                              |
| 必须撤某个包               | `npm unpublish <pkg>@7.0.0` 仅限发布后 **72 小时内**；有 dependents 的包无法撤；同一版本号撤下后 **24 小时内不能重新发布**；默认不发撤包，走 patch |

「回滚」在 npm 语义下不等于撤销：已安装 7.0.0 的用户不会因为删 tag 或撤包而回退。
发布公告与故障说明里必须写明「修复版本号」，不要让读者以为有原子回滚。

### 4.1 `changeset version` 之后任一步失败：保留现场，不自动回滚

`changeset version` 会改写 **78** 个 `package.json` 与 **78** 份 `CHANGELOG.md`
（76 个发布集包 + `lytjs-npm`、`@lytjs/playground` 两个 private 工作区包）。
之后 build / fast / slow / pack / integrity 任一步失败时，工作树已是脏的、版本已改写。

- **不自动回滚**：自动 `git checkout` 会连失败证据（失败的 dist、被改写的清单）一起抹掉。
  先留档，再决定走哪条路径。
- 留档（不改树）：

```bash
git status --porcelain > /tmp/lytjs-7.0.0-failure-status.txt
git diff --stat > /tmp/lytjs-7.0.0-failure-diffstat.txt
cp .release-progress.json /tmp/lytjs-7.0.0-progress.json 2>/dev/null || true
```

**两条路径，不能混用：**

| 路径         | 何时用                                                             | 操作                                                                                                                              |
| ------------ | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| A 断点续跑   | 已发生 publish（哪怕只成功 1 个包），修复失败步骤后继续            | 保留脏树与 `.release-progress.json`；重跑 `node scripts/release.mjs --execute --otp ...`；integrity 一致的包自动跳过              |
| B 恢复后重来 | 尚未 publish（失败在 build / fast / slow / pack / integrity 比对） | 留档后 `git checkout -- .`；`git status --porcelain` 应为空；**必须删除 `.release-progress.json`**，否则旧断点会与 6.9.6 的树混用 |

- **不要在半脏树上直接 `--execute`**：树脏且没有有效断点状态时，preflight 会拒绝；
  若手工恢复后仍留着旧 `.release-progress.json`，断点续跑分支会放宽「工作树干净」检查，
  必须避免这种组合。
- `git checkout -- .` 只恢复已跟踪文件；`changeset version` 删除的 changeset 文件会一并恢复。
  执行前确认没有未提交的手工改动。

## 5. 发布后第 3 步：弃用 25 个 5.0.1 遗留包（不 unpublish）

发布成功后按顺序做三步，本节是第 3 步：

1. 核对 **76 个发布包**的 `dist-tags.latest` 全部为 `7.0.0`（private 包不上 npm，不查）；
2. 发布公告，口径纪律见本节末；
3. **对 25 个遗留包逐个 `npm deprecate`**（本节）。

### 5.1 为什么是 deprecate，不是 unpublish

| 依据             | 事实                                                                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 有 dependents    | `@lytjs/lytjs` / `@lytjs/plugins` / `@lytjs/components` 是 5.0.1 聚合与组件包，外部项目可能直接依赖；unpublish 会让这些项目的安装与重装直接失败                 |
| 72 小时时限      | npm 只允许在**发布后 72 小时内** unpublish 某个版本；这 25 个包发布于 2021 年，早已超期，单版本撤不掉                                                           |
| 整包撤除代价更大 | 整包 unpublish 需要 `--force`，且同名包 24 小时内不能重新发布，会同时破坏所有依赖者与 CI                                                                        |
| 目标不是删除     | 目标是「用户搜到 / 装上时看到提示并转向替代包」；deprecate 保留可安装性与历史版本，只增加安装期警告，是唯一正确手段                                             |
| 权限与时机       | deprecate 与 publish 需要同一 scope 写权限，必须在 `npm login` 后执行；且文案里的迁移指南 URL 指向 `v7.0.0` tag，**tag push 之前该 URL 404，必须放在 tag 之后** |

结论：**本轮只 deprecate，不 unpublish**。真正删除只能是未来独立的、先与依赖方沟通的批次。

deprecate 失败**不影响已发布的 76 个包**：它只是给旧版本加提示，属 tag push 之后的可补做事项。因此 `scripts/release.mjs` 不执行 deprecate，也不把它串成「发布成功」的前置条件。

### 5.2 文案口径

- 统一结构：`5.0.1 为 2021 年遗留版本，已停止维护；<替代包/迁移说明>。迁移指南：<URL>`
- URL 固定用：`https://gitee.com/lytjs/lytjs/blob/v7.0.0/docs/migration/v7.0.0.md`
- 25 个包中**有 3 个能确定替代者**；其余 22 个一律标 `[需 owner 定文案]`，不要自拟。
- 若发版时 owner 仍未给文案：**只执行 3 条有明确替代者的**，22 条保持未标记。
  不要用含糊措辞补位 —— 发一条指错名字的 deprecate 比不发更糟，用户会以为新包就是那个名字。
- `@lytjs/plugins` 的文案必须点名：**「`@lytjs/plugins` 已废弃，替代为 `@lytjs/plugin`（插件系统核心）」**（owner 拍板：`@lytjs/plugin` 是 canon，不改名）。

### 5.3 完整命令清单

```bash
# 明确替代者（owner 复核文案后可直接执行）
npm deprecate "@lytjs/components@*" "5.0.1 为 2021 年遗留版本，已停止维护；请改用 @lytjs/ui（官方 UI 组件库）。迁移指南：https://gitee.com/lytjs/lytjs/blob/v7.0.0/docs/migration/v7.0.0.md" --registry https://registry.npmjs.org/
npm deprecate "@lytjs/plugins@*" "5.0.1 为 2021 年遗留版本，已废弃；替代为 @lytjs/plugin（插件系统核心）。迁移指南：https://gitee.com/lytjs/lytjs/blob/v7.0.0/docs/migration/v7.0.0.md" --registry https://registry.npmjs.org/
npm deprecate "@lytjs/plugin-vite@*" "5.0.1 为 2021 年遗留版本，已停止维护；请改用 @lytjs/bundler 的 createVitePlugin()。迁移指南：https://gitee.com/lytjs/lytjs/blob/v7.0.0/docs/migration/v7.0.0.md" --registry https://registry.npmjs.org/

# 以下 22 个：[需 owner 定文案] —— 先把 <文案> 换成定稿再执行
npm deprecate "@lytjs/lytjs@*" "<文案>" --registry https://registry.npmjs.org/              # [需 owner 定文案]
npm deprecate "@lytjs/plugin-i18n@*" "<文案>" --registry https://registry.npmjs.org/        # [需 owner 定文案]
npm deprecate "@lytjs/plugin-auth@*" "<文案>" --registry https://registry.npmjs.org/        # [需 owner 定文案]
npm deprecate "@lytjs/plugin-logger@*" "<文案>" --registry https://registry.npmjs.org/      # [需 owner 定文案]
npm deprecate "@lytjs/plugin-theme@*" "<文案>" --registry https://registry.npmjs.org/       # [需 owner 定文案]
npm deprecate "@lytjs/plugin-storage@*" "<文案>" --registry https://registry.npmjs.org/     # [需 owner 定文案]
npm deprecate "@lytjs/plugin-sdk@*" "<文案>" --registry https://registry.npmjs.org/         # [需 owner 定文案]
npm deprecate "@lytjs/plugin-chart@*" "<文案>" --registry https://registry.npmjs.org/       # [需 owner 定文案]
npm deprecate "@lytjs/plugin-highlight@*" "<文案>" --registry https://registry.npmjs.org/   # [需 owner 定文案]
npm deprecate "@lytjs/plugin-virtual-list@*" "<文案>" --registry https://registry.npmjs.org/ # [需 owner 定文案]
npm deprecate "@lytjs/plugin-registry@*" "<文案>" --registry https://registry.npmjs.org/    # [需 owner 定文案]
npm deprecate "@lytjs/plugin-form@*" "<文案>" --registry https://registry.npmjs.org/        # [需 owner 定文案]
npm deprecate "@lytjs/plugin-animation@*" "<文案>" --registry https://registry.npmjs.org/   # [需 owner 定文案]
npm deprecate "@lytjs/plugin-data-fetch@*" "<文案>" --registry https://registry.npmjs.org/  # [需 owner 定文案]
npm deprecate "@lytjs/plugin-testing@*" "<文案>" --registry https://registry.npmjs.org/     # [需 owner 定文案]
npm deprecate "@lytjs/plugin-validation@*" "<文案>" --registry https://registry.npmjs.org/  # [需 owner 定文案]
npm deprecate "@lytjs/plugin-data@*" "<文案>" --registry https://registry.npmjs.org/        # [需 owner 定文案]
npm deprecate "@lytjs/ai@*" "<文案>" --registry https://registry.npmjs.org/                 # [需 owner 定文案]
npm deprecate "@lytjs/performance@*" "<文案>" --registry https://registry.npmjs.org/        # [需 owner 定文案]
npm deprecate "@lytjs/micro-frontend@*" "<文案>" --registry https://registry.npmjs.org/     # [需 owner 定文案]
npm deprecate "@lytjs/vscode-extension@*" "<文案>" --registry https://registry.npmjs.org/   # [需 owner 定文案]
npm deprecate "@lytjs/lytx@*" "<文案>" --registry https://registry.npmjs.org/               # [需 owner 定文案]
```

### 5.4 校验与可逆

```bash
# 单个校验：有输出即已标记，空输出即未生效
npm view "@lytjs/components" deprecated --registry https://registry.npmjs.org/

# 25 个批量校验
for p in lytjs plugins components plugin-i18n plugin-auth plugin-logger plugin-theme \
  plugin-storage plugin-sdk plugin-chart plugin-highlight plugin-virtual-list plugin-registry \
  plugin-vite plugin-form plugin-animation plugin-data-fetch plugin-testing plugin-validation \
  plugin-data ai performance micro-frontend vscode-extension lytx; do
  msg=$(npm view "@lytjs/$p" deprecated --registry https://registry.npmjs.org/)
  [ -n "$msg" ] && echo "OK   @lytjs/$p" || echo "MISS @lytjs/$p"
done

# 可逆：空字符串即撤销弃用标记
npm deprecate "@lytjs/<pkg>@*" "" --registry https://registry.npmjs.org/
```

### 5.5 发布公告口径（纪律）

- **禁止**写：「整个 scope 升到 7.0.0」「`@lytjs/*` 全量升级」「98 个包同步发布」。
- **正确**写法：本次发布 **76 个发布包**升到 `7.0.0` 并上 npm；scope 里另有 **25 个 2021 年遗留包**（latest `5.0.1`）只做 deprecate、不升版；`config` / `di` / `plugin` 为首次发布。另有 2 个 private 工作区包同步升版、不上 npm，公告不必提。（发布前 scope 98 个 = 73 个 `6.9.6` + 25 个 `5.0.1`；发布后 101 = 76 个 `7.0.0` + 25 个 `5.0.1`。）
- 迁移口径：升级用户起点是 `6.9.6`（迁移指南基线，见 §3）。

## 6. 3 个首次发布包名字确认（必须在 `changeset version` 之前定）

`@lytjs/config`、`@lytjs/di`、`@lytjs/plugin` 在官方源均无任何版本（本地 `version: 6.9.6` 只是工作区占位），`7.0.0` 是它们的首次发布。包名一旦发布就不能收回，只能在事后 deprecate，因此必须在 `changeset version` 前确认。

### 6.1 它们为什么在 76 个发布包里

不是 changesets 声明，也不是「本该 private」：

1. [release-set.mjs](file:///Volumes/Data/lytjs/lytjs/scripts/release-set.mjs#L91-L96)：发布根 = workspace globs 位于 `packages/` 下的包；发布集 = 发布根内 `private !== true` 且不在 `config.ignore` 的包。
2. `.changeset/config.json` 的 `ignore` 是空数组。
3. 三者 `package.json` 都没有 `private: true`。

⇒ 三者是被**派生规则**收进发布集的；仓库内没有任何 changeset 文件点名它们。

### 6.2 为什么不能改成 private

它们是 7.0.0 新增的**运行时依赖**，不是内部工具：

| 依赖方                                                                                         | 声明                         | 线上 6.9.6 是否已含 |
| ---------------------------------------------------------------------------------------------- | ---------------------------- | ------------------- |
| [core/package.json](file:///Volumes/Data/lytjs/lytjs/packages/core/package.json#L44)           | `@lytjs/config: workspace:*` | 否                  |
| [core/package.json](file:///Volumes/Data/lytjs/lytjs/packages/core/package.json#L47)           | `@lytjs/plugin: workspace:*` | 否                  |
| [component/package.json](file:///Volumes/Data/lytjs/lytjs/packages/component/package.json#L31) | `@lytjs/di: workspace:*`     | 否                  |

`@lytjs/core@7.0.0` / `@lytjs/component@7.0.0` 发布后，用户安装时必须能从 npm 解析到这三个包；若设 `private: true`，安装链直接断。**结论：三个包必须发布，不能 private。**

### 6.3 元数据一致性（对照已发布的 `@lytjs/store`）

| 字段                        | config / di / plugin                          | `@lytjs/store`（已发布） | 判定                                           |
| --------------------------- | --------------------------------------------- | ------------------------ | ---------------------------------------------- |
| `type`                      | module                                        | module                   | 一致                                           |
| `main` / `module` / `types` | `dist/index.{cjs,mjs,d.ts}`                   | 同                       | 一致                                           |
| `exports`                   | `.`（types/import/require）+ `./package.json` | 同                       | 一致                                           |
| `files`                     | `["dist", "src"]`                             | 同                       | 一致                                           |
| `sideEffects`               | false                                         | false                    | 一致                                           |
| `license`                   | MIT                                           | MIT                      | 一致                                           |
| `repository`                | gitee + `directory`                           | 同                       | 一致                                           |
| `keywords`                  | 有                                            | 有                       | 一致                                           |
| `author`                    | 无                                            | 无                       | 一致（仓库普遍不写）                           |
| `publishConfig`             | 无                                            | 无                       | 一致（`access: public` 由 changeset 配置提供） |
| `private`                   | 无                                            | 无                       | 一致                                           |

三者 description 均为中文、`LytJS 独立通用…系统…零框架依赖` 句式，与仓库中文优先口径一致；无需改。

### 6.4 命名混淆风险（待 owner 拍板）

- `@lytjs/plugin`（本次首发、插件体系核心）与线上遗留的 `@lytjs/plugins`（5.0.1 插件聚合包）只差一个 `s`；
- 线上另有 **17 个** `@lytjs/plugin-*`（5.0.1 遗留），其中 13 个已迁出到 `gitee.com/lytjs/plugins.git`，monorepo 内已无对应目录；
- 风险：用户搜 `plugin` 会同时看到核心包、聚合包与 17 个 5.0.1 插件，无法从名字判断谁是 7.0.0 的正主。

可选处置（三选一，owner 定）：

1. **保留 `@lytjs/plugin`**：靠 §5 的 deprecate 文案把遗留包引向核心包；
2. **首发前改名**（如 `@lytjs/plugin-core`）：必须改 `package.json.name`，以及 [core/package.json](file:///Volumes/Data/lytjs/lytjs/packages/core/package.json#L47) 与 [plugin/package.json](file:///Volumes/Data/lytjs/lytjs/packages/ecosystem/packages/plugin/package.json) 的依赖声明；
3. **暂不首发（设 private）**：会破坏 core / component 安装链，**不可行**（见 6.2）。

若改名，必须在 `changeset version` 之前完成；发布后再改等于换包名重新发。

### 6.5 结论（owner 已拍板：不改名，维持发布）

- `@lytjs/plugin` 不改名：它是 canon，遗留的 `@lytjs/plugins` 与 17 个 `plugin-*` 才是退场方；改一个 `core` 直接依赖的包名要重算 lock、重跑全链门禁，收益不抵成本。
- description 已是「LytJS 独立通用插件系统核心…」，无需改。
- 消歧改为文档 + 弃用文案：`@lytjs/plugins` 的 deprecate 文案点名「已废弃，替代为 `@lytjs/plugin`」（见 §5.3）。
- 17 个 `plugin-*` 中仅 `plugin-vite` 有仓库内可证实的新包（`@lytjs/bundler` 的 `createVitePlugin()`）；其余 16 个没有可证实的对应包名，仍标 `[需 owner 定文案]`。

## 7. 版本引用清单（只出清单，发版后一次性处理）

扫描基准：2026-11-14，HEAD `54f6e99d`，匹配字面量 `6.9.6`。分类：

- **A 自动更新**：`changeset version` / `pnpm install` 会改写，不要手改；
- **B 该改**：发版后必须手改，否则文档 / 产物 / 门禁与线上不一致；
- **C fixture 故意保留**：示例与脚手架模板故意锁 `6.9.6`，非发布阻断；
- **D 历史记录禁改**：CHANGELOG、ADR、NOW-history、本单快照、迁移指南基线；
- **E 本就不该出现**：数据错误或过期清单，需订正。

| 位置                                                                                   | 出现数             | 分类 | 处理                                                         |
| -------------------------------------------------------------------------------------- | ------------------ | ---- | ------------------------------------------------------------ |
| `pnpm-lock.yaml`                                                                       | 173 行             | A    | `pnpm install` 后自动重写                                    |
| `package.json` 的 `version`（changeset 升版对象）                                      | 78                 | A    | `changeset version`（76 发布集 + 2 private；private 不发布） |
| 根 `package.json:3`                                                                    | 1                  | B    | 非发布物；建议随发版改为 `7.0.0`，不阻断                     |
| `examples/package.json:3`                                                              | 1                  | B    | 非发布工程（`@lytjs/examples`），可留                        |
| `README.md`                                                                            | 4（85/87/477/484） | B    | 版本说明、release-parity 注释、`v6.9.6（最新版本）` 标题     |
| `docs/getting-started/quick-reference.md:4`、`for-beginners.md:4`                      | 2                  | B    | 起步文档版本号                                               |
| `docs/ecosystem/other/compat.md:8`                                                     | 1                  | B    | 6.9.6 缺陷说明，7.0.0 修复后复核措辞                         |
| `docs/contribute/roadmap/current.md`                                                   | 6                  | B/D  | 3/27/41/48 该改；164/170 是迁出历史，可留                    |
| `docs/contribute/architecture/ecosystem-migration.md`                                  | 4（34/45/73/74）   | B    | 版本契约与依赖 range                                         |
| `docs/SUMMARY.md:46`                                                                   | 1                  | D    | 「6.9.6 → 7.0.0」迁移描述，保留                              |
| `docs/migration/v7.0.0.md`                                                             | 7                  | D    | 升级基线，保留                                               |
| `docs/release/RELEASE-READINESS-7.0.0.md`                                              | 5                  | D    | 本单快照，保留                                               |
| `.ai/QUICKSTART.md:13`、`.ai/PROJECT_CONTEXT.md:8`                                     | 2                  | B    | AI 上下文版本号                                              |
| `PUBLISH-MANIFEST.md`                                                                  | 3（1/104/107）     | B/E  | 发布后更新为 7.0.0 清单，否则与 README 口径冲突              |
| `keel/CONSTITUTION.md:15`                                                              | 1                  | B    | 「npm 线上 6.9.6」需改；注意 keel 字节上限                   |
| 包 README 依赖表（compiler 5、component 8、dom 2、renderer 11、compat 1）              | 27                 | B    | 依赖版本表统一升到 `^7.0.0`                                  |
| `packages/ecosystem/packages/ui/src/index.ts:344`                                      | 0（已消除）        | —    | 改为构建期注入，见本节末「已消除的手写版本号」               |
| `packages/tools/packages/cli/src/commands/create.ts`                                   | 6（+1 注释）       | C    | 脚手架模板；发版后下一个 patch 前改为读 `package.json`       |
| `packages/tools/packages/cli/src/commands/run.ts:25`                                   | 1                  | C    | `FALLBACK_VERSION`                                           |
| `packages/tools/packages/cli/tests/*`                                                  | 4                  | C    | 模板断言随模板同步                                           |
| `scripts/check-docs.mjs:9`                                                             | 1                  | B    | 文档版本门禁常量，与文档同批改                               |
| `scripts/release-parity-expectation.json:2-3`、`release-state.json:2`                  | 3                  | B    | **发版后第 1 步更新**，否则 parity 门禁红                    |
| `scripts/check-release-parity.mjs:9-10`、`scripts/gate.mjs:759`                        | 3                  | B    | 注释 / 描述文本，低优先                                      |
| `examples/{data-table,router-dashboard,using-lytjs-as-dep}/package.json`               | 10（`^6.9.6`）     | C    | 与 §8「fixture 硬编码」一致，故意保留                        |
| `CHANGELOG.md`                                                                         | 229 处 / 77 文件   | D    | **禁改**（历史发布记录）                                     |
| `keel/decisions/**`、`keel/NOW-history/**`                                             | 多处               | D    | **禁改**（历史决策与记录）                                   |
| `scripts/check-dead-packages.ts:48`、`scripts/codemod-v7.mjs:3`、`vitest.shared.ts:70` | 3                  | D    | 历史注释 / 迁移说明，保留                                    |
| `packages/ecosystem/packages/compat/src/index.ts:13`                                   | 1                  | D    | 历史说明注释                                                 |

### 已消除的手写版本号（发布前必修，已完成）

- `@lytjs/ui`：`src/index.ts` 的 `version: '6.9.6'` 改为 tsup `define` 注入 `__UI_VERSION__`（值来自 `package.json.version`）。不运行时读 `package.json`，避免把文件解析带进产物。
- 门禁 `check-runtime-version`（fast，needsDist）：断言 dist 的 ESM + CJS 导出的 `LytUI.version` 等于 `package.json.version`，并扫描发布集 src 禁止再写自身版本字面量。负控：只改 `package.json.version` 不重建 ⇒ 2 项红。
- **顺序**：本项必须先于 `changeset version` 完成 —— version 一旦变化，注入值必须由随后的构建更新；先升版后注入会让产物滞后一个版本。
- 全仓扫描结论：发布集 src 中**无第二处无条件包版本常量**。`@lytjs/cli` 的 `FALLBACK_VERSION`（`run.ts:25`）优先读 `package.json`、仅兜底，随 CLI 模板同批处理；`reactivity` 的 `0.9.9`、`devtools` 的 `1.0.0`、脚手架模板的 `0.1.0` 等是协议 / 模板版本，不是包版本。

处理顺序：

1. **发版后立刻**：`release-state.json`、`release-parity-expectation.json`、`README.md:85` 的 parity 注释三者同批改为 `7.0.0`，否则 fast 门禁红；
2. 文档与包 README 同批；
3. CLI 模板与 `FALLBACK_VERSION` 在下一个 patch 前处理；
4. 禁止改动：CHANGELOG、ADR、NOW-history、迁移指南基线。

## 8. 已知延期项

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

## 9. 未执行声明

- 未运行 `changeset version` 落盘（此前仅隔离 worktree 干跑）。
- 未创建 `v7.0.0` tag。
- 未执行 `npm publish`。
- 未执行任何 `npm deprecate`（§5 只是命令清单与文案口径）。
- 发布动作等 owner 明确放行。

## 10. 提交 scope：是域值约定，不是包名

- 真源：[commitlint.config.js](file:///Volumes/Data/lytjs/lytjs/commitlint.config.js#L21-L39) 的
  `scope-enum` 是 **13 个域值**：`common`、`reactivity`、`vdom`、`compiler`、`renderer`、
  `component`、`core`、`shared-types`、`e2e`、`docs`、`ci`、`release`、`keel`。
  这是**域**的白名单，不是 76 个包名的白名单。
- 本文早前版本写过「scope 必须对上包名，`fix(component)` 算反例」——**该批评是错的，已撤回**。
  实测：`e42cc23d`（`fix(component): 版本号改为构建期注入并新增运行时版本门禁`）
  用 `commitlint --edit` 校验退出码 0；对照组 `fix(ui)` 被拒（`scope must be one of [...]`）。
  即 lint 在 commit-msg 生效，该提交**合规**，不是漏检。历史提交不改，也不作为反例。
- `ui` 不在域值内。按既有约定（[commitlint-rules.md](file:///Volumes/Data/lytjs/lytjs/keel/archive/pitfalls/process/commitlint-rules.md)）：
  `ui` 相关提交**省略 scope**，写成 `fix: ...`。`fix(component)` 能过 lint，但 `component` 域指
  `@lytjs/component`，不指 `@lytjs/ui`；今后 ui 变更一律省略 scope。
- **不扩充 `scope-enum`**：不把 76 个包名塞进白名单。缺的是「域 → 包」映射，见下表。

| 域值           | 涵盖的包 / 路径                                                                     |
| -------------- | ----------------------------------------------------------------------------------- |
| `common`       | `packages/common/packages/*`：`@lytjs/common` + 33 个 `@lytjs/common-*`（共 34 个） |
| `reactivity`   | `@lytjs/reactivity`                                                                 |
| `vdom`         | `@lytjs/vdom`                                                                       |
| `compiler`     | `@lytjs/compiler`                                                                   |
| `renderer`     | `@lytjs/renderer`（DOM / SSR / Vapor 渲染后端）                                     |
| `component`    | `@lytjs/component`（组件实例、props、emits、slots、生命周期）；**不含 `@lytjs/ui`** |
| `core`         | `@lytjs/core`、`@lytjs/core-vnode`、`@lytjs/core-signal`                            |
| `shared-types` | `@lytjs/shared-types`、`@lytjs/host-contract`（渲染宿主契约的类型定义）             |
| `e2e`          | `tests/e2e/**` 与跨包端到端用例                                                     |
| `docs`         | `docs/**`（`docs/release/**` 除外）、根 `README.md`、`.ai/**`                       |
| `ci`           | `.github/workflows/**` 及其它 CI 配置                                               |
| `release`      | `.changeset/**`、`scripts/release*.mjs`、`docs/release/**`、`PUBLISH-MANIFEST.md`   |
| `keel`         | `keel/**`                                                                           |

其余 32 个包（`ui`、`store`、`bundler`、`devtools`、`devtools-extension`、`config`、`di`、`plugin`、
`compat`、`cli`、`test-utils`、`router`、`router-fs`、`http-server`、`api`、`metadata`、`middleware`、
`middleware-auth`、`middleware-cors`、`middleware-rate-limit`、`ssr`、`ssg`、`hmr`、`html-renderer`、
`cache`、`cache-isr`、`platform-adapter`、`runtime-edge`、`adapter-web`、`dom`、`dom-runtime`、`web`）
**没有对应域值，一律省略 scope**，不要硬套最接近的域值。
