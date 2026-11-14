---
scope: meta
status: active
last-verified: 2026-11-14
keywords: [校验, 规则, 扩展检查, CI, 门禁]
---

# 扩展检查（项目自定）

> Keel 内核只做通用检查（`keel-lint.sh`）。本文件与 `scripts/gate.mjs` 的
> `GATES` **逐条对齐**（2026-11-14：83 条 = 61 fast + 22 slow）。
> 门禁名、命令、描述、耗时以 `scripts/gate.mjs` 为单一真源，本文件只做清单核对。
> 单条执行：`node scripts/gate.mjs <name>`；整档：`--tier fast` / `--tier slow`。

## 已登记的扩展检查（83）

**fast（61）**

check-lockfile、check-build-order、check-deps、check-render-parity、check-list-diff、
check-public-names、check-stale-capability-claims、check-signal-authority、
check-dead-packages、check-e2e-assertions、check-src-hygiene、check-ui-slot-single-node、
check-ui-props-wiring、check-keel-wiring、check-script-refs、check-as-unknown、
check-ui-styles、check-ui-contracts、check-ui-i18n、check-dist-freshness、
check-package-exports、check-package-metadata、check-publish-private、check-release-workflow、check-consumer-demo、check-examples、
check-render-shapes、check-component-status、check-component-shapes、check-render-cost、
check-ssr-client-parity、check-package-deps、check-error-paths、check-di、check-cache、
check-ssr-isolation、check-lifecycle-release、check-http-protocol、check-edge-runtime、
check-negative-controls、check-compiler-parity、check-hmr、check-scaffold、
check-api-routes、check-transition-engine、check-event-semantics、check-controlled-props、
check-dialog-a11y、check-dev-warnings、check-plugin-semantics、check-store-semantics、
check-reactivity-semantics、check-security-html、check-core-signal-contract、
check-release-parity、check-runtime-version、check-web-cssvars、check-config-semantics、
check-router-semantics、check-hydration、check-vitest-alias-dist

**slow（22）**

check-integration、check-runtime-render、check-bundle-size、
build、build:fallback、check-runtime-contract、check-api-snapshot、
check-signal-profile-snapshot、check-signal-output-evaluates、
check-cross-entry-singletons、check-release-artifacts、check-doc-imports、
check-circular、check-circular:src、type-check、lint:check、format:check、
test、test:coverage、coverage:snapshot、check-coverage-snapshot、
check-negative-controls:slow

级别：全部 ❌ fail；触发时机以 `scripts/gate.mjs` 的 `tier` 与 CI job 为准。

## needsDist 口径（2026-11-14）

读 dist 作判定的门禁一律 `needsDist: true`，任何含它的运行都自动前置
`check-dist-freshness`；stale 即 exit 1。slow 固定 `build → build:fallback →
freshness → 其余`，单独点名也先判。此前未标记项之绿可能基于陈旧 dist，不可横比。

## 级别变更记录

- **2026-11-14｜发布物验收 + 发布集私有化**
  `check-publish-private`（fast）：发布集由 workspace + changeset config 派生，集外包必须 private
  （`lytjs-npm` 曾被补丁升版带进队列）。`check-release-artifacts`（slow，needsDist）：
  76 包 pack → 隔离安装 → 121 subpath resolve/import/require → tsc；CSS 按 target 扩展名归资产类。

- **2026-11-14｜release workflow 语义**：origin 非 GitHub 时 `release.yml` 必须带 `[no-ci-release]` 标记，否则失败。

- **2026-11-14｜覆盖率下沉慢档（口径变更）**：`check-coverage-snapshot` → slow，
  新增 `coverage:snapshot`；fast 不报数字。口径=现场产物+双指纹+冻结清单（坑 cov-age）。

- **2026-11-12｜清单真源对齐**：逐条登记全部门禁名（原仅 15 条聚合），补漏 `check-stale-capability-claims` / `check-signal-authority`。

- **2026-10-10｜源码卫生**：`compiler` 曾用 `eval()` 伪优化（P2-3）；现扫 `src/**/*.ts`，三条规则须显式清单，未清单化即 exit 1。

- **2026-10-10｜UI props 接线 ⚠️ warn → ❌ fail**：欠账进 `ui-props-wiring-baseline.txt`，只拦新增。

- **2026-10-11｜治理接线**：`test-lint.sh` 已接进 `keel.yml` 并断言，移除即 exit 1。

- **2026-11-06｜Golden 20 契约 + i18n**：契约逐格从源码推导并与登记比对；i18n 棘轮 27 → 0。

## CI 接入状态（诚实说明）

- `keel-gates`（`ci.yml`）：源码级、无需 dist，每次 push/PR；
- `build` 后置项：需 dist ⇒ 排在 `pnpm run build` 之后；
- `keel.yml`：基座自身，零依赖 bash；定时兜底 `scripts/nightly-gates.sh`。

## 一条规则的准入标准

1. 能被脚本判死——靠人记的不算；
2. 误报可接受，且有显式豁免方式（棘轮白名单必须登记原因）；
3. 级别定了别轻易改——告警降级比告警漏报更容易让人无视全部告警。
