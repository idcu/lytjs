---
scope: meta
status: active
last-verified: 2026-11-12
keywords: [校验, 规则, 扩展检查, CI, 门禁]
---

# 扩展检查（项目自定）

> Keel 内核只做通用检查（`keel-lint.sh`）。本文件与 `scripts/gate.mjs` 的
> `GATES` **逐条对齐**（2026-11-14：77 条 = 58 fast + 19 slow）。
> 门禁名、命令、描述、耗时以 `scripts/gate.mjs` 为单一真源，本文件只做清单核对。
> 单条执行：`node scripts/gate.mjs <name>`；整档：`--tier fast` / `--tier slow`。

## 已登记的扩展检查（77）

**fast（58，只读源码、无需 dist）**

check-lockfile、check-build-order、check-deps、check-render-parity、check-list-diff、
check-public-names、check-stale-capability-claims、check-signal-authority、
check-dead-packages、check-e2e-assertions、check-src-hygiene、check-ui-slot-single-node、
check-ui-props-wiring、check-keel-wiring、check-script-refs、check-as-unknown、
check-ui-styles、check-ui-contracts、check-ui-i18n、check-dist-freshness、
check-package-exports、check-package-metadata、check-consumer-demo、check-examples、
check-render-shapes、check-component-status、check-component-shapes、check-render-cost、
check-ssr-client-parity、check-package-deps、check-error-paths、check-di、check-cache、
check-ssr-isolation、check-lifecycle-release、check-http-protocol、check-edge-runtime、
check-negative-controls、check-compiler-parity、check-hmr、check-scaffold、
check-api-routes、check-transition-engine、check-event-semantics、check-controlled-props、
check-dialog-a11y、check-dev-warnings、check-plugin-semantics、check-store-semantics、
check-reactivity-semantics、check-security-html、check-core-signal-contract、
check-release-parity、check-web-cssvars、check-config-semantics、
check-router-semantics、check-hydration、check-vitest-alias-dist

**slow（19，需要 dist 或全量执行）**

check-integration、check-runtime-render、check-bundle-size、
build、build:fallback、check-runtime-contract、check-api-snapshot、
check-signal-profile-snapshot、check-doc-imports、check-circular、check-circular:src、
type-check、lint:check、format:check、test、test:coverage、
coverage:snapshot、check-coverage-snapshot、check-negative-controls:slow

级别：全部 ❌ fail；触发时机以 `scripts/gate.mjs` 的 `tier` 与 CI job 为准。

## 级别变更记录

- **2026-11-14｜覆盖率门禁下沉慢档（口径变更）**
  `check-coverage-snapshot` → slow，新增 `coverage:snapshot`；fast 不再报覆盖率数字。
  口径改为现场产物 + 双指纹 + 逐文件冻结清单（详见坑 cov-age）。

- **2026-11-12｜清单真源对齐**
  此前只登记 15 条聚合项，与 `gate.mjs` 的 76 条不一致；现逐条登记全部
  门禁名（59 fast / 17 slow），补上此前漏登记的
  `check-stale-capability-claims`、`check-signal-authority`。
  负控表同步为 75 verified + 1 uninjectable（`check-negative-controls:slow`）。

- **2026-10-10｜源码卫生（`check-src-hygiene`）**
  `compiler/src/optimizations/index.ts` 曾用 `eval()` 做伪优化（P2-3）。
  现扫描 `src/**/*.ts`，三条规则各配显式清单（须写理由），未清单化即 exit 1。

- **2026-10-10｜UI props 接线：⚠️ warn → ❌ fail（收紧）**
  升级前该脚本恒 exit 0；现按棘轮改造：既有欠账进
  `scripts/ui-props-wiring-baseline.txt`，只拦新增，升级当口欠账为 0。

- **2026-10-11｜治理接线（`check-keel-wiring`）**
  此前 `test-lint.sh` 只在 `install.sh` 跑、CI 无。修法：接进 `keel.yml`
  并断言接线在；实测移除 test-lint ⇒ exit 1。

- **2026-11-06｜Golden 20 六类契约 + i18n**
  `check-ui-contracts` 逐格从源码推导后与 `scripts/ui-contracts.json` 比对，
  初始 15 红全部登记原因（无 skip）；B05 扩到七类 140 格（a11y 修后 19/0/1）。
  `check-ui-i18n` 扫描 CJK 字面量，棘轮基线 27 → 0。

## CI 接入状态（诚实说明）

- `keel-gates` job（`ci.yml`）：源码级检查，**无需 dist**，每次 push/PR 跑；
- `build` job 后置项：需要 dist ⇒ 必须排在 `pnpm run build` 之后；
- `keel.yml`：基座自身（`keel-lint` + 钩子本体），零依赖 bash 直跑；
- 定时兜底：`scripts/nightly-gates.sh`（慢档全量；发布前手动 `gate --tier slow`）。

## 一条规则的准入标准

1. 能被脚本判死——靠人记的不算；
2. 误报可接受，且有显式豁免方式（棘轮白名单必须登记原因）；
3. 级别定了别轻易改——告警降级比告警漏报更容易让人无视全部告警。
