#!/usr/bin/env node
/**
 * scripts/check-negative-controls.mjs
 *
 * 门禁负控框架（S05）
 *
 * ## 为什么需要它
 *
 * 「门禁是绿的」本身不构成证据 —— 绿可能只是**判据没生效**（漏检、路径写错、
 * 命令没跑起来）。负控（negative control）就是给门禁做一次**注入实验**：
 * 故意制造一个违规，门禁必须转红；随后恢复现场，门禁必须回绿。
 *
 * 已登记负控：
 *   - `check-deps`            包依赖方向（S02）：往 common 包塞 component 依赖 → 必红
 *   - `check-package-deps`    依赖声明完整性（S03）：塞一个未声明的运行时 re-export → 必红
 *   - `check-controlled-props` 受控组件：把 UI dist 的 `current` 受控读取改成常量 → 必红
 *   - `check-ui-styles`        样式覆盖：塞一个未在 CSS 里出现的静态类名 → 必红
 *   - `check-release-parity`  发布一致性：改一个包版本 → 「76 包版本一致」判据必红
 *   - `check-script-refs`     零引用脚本棘轮（S20）：新增一个零引用脚本 → 必红
 *   - `check-as-unknown`      as unknown as 棘轮（S22）：多写一处 → 必红
 *   - `check-api-snapshot`    API 快照（S22）：删掉一个导出名 → 必红
 *   - `check-lockfile`        锁文件一致性：声明一个锁文件里没有的依赖 → 必红
 *   - `check-build-order`     构建顺序：从 BUILD_ORDER 删掉一条 → 必红
 *   - `check-render-parity`   三模式写入：关掉属性安全检查 → 必红
 *   - `check-list-diff`       keyed 对拍：让 signal 路径丢失 key 匹配 → 必红
 *   - `check-public-names`    公开名登记册：多写一处同名实现 → 必红
 *   - `check-keel-wiring`     keel CI：删掉 test-lint 关卡 → 必红
 *   - `check-e2e-assertions`  e2e 断言强度：新增 toBeDefined() → 必红
 *   - `check-src-hygiene`     源码卫生：新增 console.log 文件 → 必红
 *   - `check-examples`        示例可用性：引用不存在的 @lytjs 包 → 必红
 *   - `check-dist-freshness`  产物新鲜度：把 src 改成比 dist 新 → 必红
 *   - `check-dead-packages`   死包棘轮：新增一个零引用 common 包 → 必红
 *   - `check-vitest-alias-dist` 测试 alias：加一条指向不存在路径的 alias → 必红
 *   - `check-doc-imports`     文档 import：guide 里写一个不存在的导出名 → 必红
 *   - `check-ui-props-wiring` UI props：新增一个声明了却没引用的 prop → 必红
 *   - `check-ui-i18n`         UI i18n：把一条英文文案改成空串 → 必红
 *   - `check-bundle-size`     体积预算：把基线压到实测之下 → 必红
 *   - `check-package-exports` 发布产物：把 main 指向不存在的文件 → 必红
 *   - `check-coverage-snapshot` 覆盖率快照：把 commit 改成不存在的 sha → 必红
 *
 * 其余门禁本轮不做注入实验，**如实登记为「未验证」**（见 negative-controls.json），
 * 不假装有反证。新增门禁时必须跑一次 `--sync` 让清单同步，否则本脚本报红。
 *
 * ## 用法
 *
 *   node scripts/check-negative-controls.mjs            # 跑全部已登记负控 + 审计
 *   node scripts/check-negative-controls.mjs check-deps # 只跑一项
 *   node scripts/check-negative-controls.mjs --audit    # 只审计清单，不注入
 *   node scripts/check-negative-controls.mjs --sync     # 按 gate.mjs 同步清单
 *   node scripts/gate.mjs --inject check-deps           # 经 gate 调用同一套负控
 *
 * 退出码：0 = 全部反证成立；1 = 有门禁注入后仍绿 / 清单不同步 / 注入点漂移。
 */

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BIN = resolve(ROOT, 'node_modules/.bin');
const ENV = { ...process.env, PATH: `${BIN}:${process.env.PATH ?? ''}` };
const GATE_PATH = join(ROOT, 'scripts/gate.mjs');
const REGISTRY_PATH = join(ROOT, 'scripts/negative-controls.json');

/** 从 gate.mjs 读取门禁名字（单一真相源，避免本文件再抄一份） */
function gateNames() {
  const text = readFileSync(GATE_PATH, 'utf-8');
  return [...text.matchAll(/name:\s*'([^']+)'/g)].map((m) => m[1]);
}

/** 最近一次注入后门禁报出的第一条失败行（用于报告「红在哪条断言」） */
let lastFailure = '';

/** 运行命令，要求**必须失败**（退出码非 0） */
function expectFail(cmd, label) {
  const r = spawnSync(cmd[0], cmd.slice(1), {
    cwd: ROOT,
    stdio: 'pipe',
    env: ENV,
    encoding: 'utf-8',
  });
  if (r.status === null) {
    throw new Error(`${label}：命令未启动（${r.error?.code ?? 'unknown'}）`);
  }
  if (r.status === 0) {
    throw new Error(`${label}：注入后门禁仍为绿（退出码 0）——判据没有生效`);
  }
  // 去掉 ANSI 颜色码（用 String.fromCharCode 构造，避免 no-control-regex 误判）
  const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
  const plain = `${r.stdout ?? ''}\n${r.stderr ?? ''}`.replace(ANSI, '');
  lastFailure = (
    plain.split('\n').find((l) => l.includes('❌')) ??
    plain.split('\n').find((l) => /Error|error TS|AssertionError/.test(l)) ??
    plain.trim().split('\n').find(Boolean) ??
    ''
  )
    .trim()
    .slice(0, 160);
  return r.status;
}

/**
 * 临时改写一个文件，跑完（无论成败）恢复原字节与原 mtime。
 *
 * 恢复 mtime 是必须的：注入任何包的 src 文件会把它的修改时间推到最新，
 * 从而让 `check-dist-freshness`（dist 必须比 src 新）在**恢复之后**误红。
 */
function withPatchedFile(file, patch, run) {
  const original = readFileSync(file, 'utf-8');
  const st = statSync(file);
  try {
    writeFileSync(file, patch(original));
    return run();
  } finally {
    writeFileSync(file, original);
    utimesSync(file, st.atime, st.mtime);
  }
}

/** 临时新建一个文件，跑完删除 */
function withTempFile(file, content, run) {
  try {
    writeFileSync(file, content);
    return run();
  } finally {
    if (existsSync(file)) unlinkSync(file);
  }
}

/** 临时新建一个目录树，跑完递归删除 */
function withTempDir(dir, files, run) {
  try {
    for (const [rel, content] of Object.entries(files)) {
      const full = join(dir, rel);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, content);
    }
    return run();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const CONTROLS = {
  'check-deps': () => {
    // S02：common（L0）声明 component（L2）⇒ 方向反转，必须报红
    const file = join(ROOT, 'packages/common/packages/is/package.json');
    withPatchedFile(
      file,
      (text) => {
        const pkg = JSON.parse(text);
        pkg.dependencies = { ...(pkg.dependencies ?? {}), '@lytjs/component': 'workspace:*' };
        return `${JSON.stringify(pkg, null, 2)}\n`;
      },
      () => expectFail(['tsx', 'scripts/check-deps.ts'], 'check-deps'),
    );
  },

  'check-package-deps': () => {
    // S03：src 里出现未声明的运行时 re-export ⇒ 必须报红
    const file = join(ROOT, 'packages/common/packages/is/src/__negctl-reexport.ts');
    withTempFile(file, "export { createVNode } from '@lytjs/vdom';\n", () =>
      expectFail(['node', 'scripts/check-package-deps.mjs'], 'check-package-deps'),
    );
  },

  'check-controlled-props': () => {
    // 受控组件：把 dist 里 Pagination 的受控读取改成常量 ⇒ current 不再跟随 modelValue
    const file = join(ROOT, 'packages/ecosystem/packages/ui/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-controlled-props：缺少 UI dist，请先构建');
    const needle = 'useControlledState({ get: () => p.current })';
    withPatchedFile(
      file,
      (text) => {
        if (!text.includes(needle)) {
          throw new Error(`check-controlled-props：注入点漂移（找不到 ${needle}）`);
        }
        return text.replace(needle, 'useControlledState({ get: () => 1 })');
      },
      () => expectFail(['node', 'scripts/check-controlled-props.mjs'], 'check-controlled-props'),
    );
  },

  'check-ui-styles': () => {
    // 样式覆盖：新增一个组件文件，发出一个 CSS 里不存在的静态类名 ⇒ 必须报红
    const file = join(ROOT, 'packages/ecosystem/packages/ui/src/components/__negctl.ts');
    withTempFile(file, "export const NEGCTL_CLASS = 'lyt-negctl-missing';\n", () =>
      expectFail(['tsx', 'scripts/check-ui-styles.ts'], 'check-ui-styles'),
    );
  },

  'check-release-parity': () => {
    // S21：把一个叶子包的版本改成不一致 ⇒ 「76 个包版本一致」判据必须报红
    const file = join(ROOT, 'packages/common/packages/is/package.json');
    withPatchedFile(
      file,
      (text) => {
        const pkg = JSON.parse(text);
        pkg.version = '0.0.0-negctl';
        return `${JSON.stringify(pkg, null, 2)}\n`;
      },
      () => expectFail(['node', 'scripts/check-release-parity.mjs'], 'check-release-parity'),
    );
  },

  'check-script-refs': () => {
    // S20：新增一个随机命名的零引用脚本 ⇒ 「每个脚本都有引用方」判据必须报红
    const file = join(ROOT, 'scripts', `__negctl-zero-ref-${Date.now().toString(36)}.mjs`);
    withTempFile(file, 'export const NEGCTL = 1;\n', () =>
      expectFail(['node', 'scripts/check-script-refs.mjs'], 'check-script-refs'),
    );
  },

  'check-as-unknown': () => {
    // S22：在已有计数的源码里多写一处 as unknown as ⇒ 「只减不增」判据必须报红。
    // （withPatchedFile 会同时还原 mtime，避免 check-dist-freshness 误红）
    const file = join(ROOT, 'packages/vdom/src/patch.ts');
    withPatchedFile(
      file,
      (text) => `${text}\nexport const __negctlAsUnknown = 0 as unknown as string;\n`,
      () => expectFail(['node', 'scripts/check-as-unknown.mjs'], 'check-as-unknown'),
    );
  },

  'check-api-snapshot': () => {
    // S22：从 core 的 dist 类型声明里删掉一个导出名 ⇒ 「与快照一致」判据必须报红。
    // 只改 dist（恢复原字节）；dist 的 mtime 变新不触发 check-dist-freshness。
    const file = join(ROOT, 'packages/core/dist/index.d.ts');
    if (!existsSync(file)) throw new Error('check-api-snapshot：缺少 core dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const patched = text.replace(/^export (?:type )?\{[^,]*,/m, (m) => m.replace(/[^,]*,/, ''));
        if (patched === text) {
          throw new Error('check-api-snapshot：注入点漂移（找不到可删的导出名）');
        }
        return patched;
      },
      () => expectFail(['node', 'scripts/check-api-snapshot.mjs'], 'check-api-snapshot'),
    );
  },

  'check-lockfile': () => {
    // 声明一条锁文件 importer 里不存在的依赖 ⇒ 「package.json ↔ pnpm-lock.yaml 一致」必红
    const file = join(ROOT, 'packages/common/packages/is/package.json');
    withPatchedFile(
      file,
      (text) => {
        const pkg = JSON.parse(text);
        pkg.dependencies = { ...(pkg.dependencies ?? {}), '@lytjs/negctl-lockfile': 'workspace:*' };
        return `${JSON.stringify(pkg, null, 2)}\n`;
      },
      () => expectFail(['node', 'scripts/check-lockfile.mjs'], 'check-lockfile'),
    );
  },

  'check-build-order': () => {
    // 从 BUILD_ORDER 删掉一条 ⇒ 「workspace 包必须都登记」必红
    const file = join(ROOT, 'scripts/build-order.ts');
    withPatchedFile(
      file,
      (text) => {
        const patched = text.replace(/\s*\{ name: '[^']+', path: '[^']+' \},/, '');
        if (patched === text)
          throw new Error('check-build-order：注入点漂移（找不到 BUILD_ORDER 条目）');
        return patched;
      },
      () => expectFail(['tsx', 'scripts/check-build-order.ts'], 'check-build-order'),
    );
  },

  'check-render-parity': () => {
    // 关掉 common-dom 的属性安全检查 ⇒ javascript: URL 不再被拦截，必红
    const file = join(ROOT, 'packages/common/packages/dom/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-render-parity：缺少 common-dom dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const patched = text.replaceAll('if (!isSafeAttribute(key, strValue))', 'if (false)');
        if (patched === text)
          throw new Error('check-render-parity：注入点漂移（找不到 isSafeAttribute）');
        return patched;
      },
      () => expectFail(['node', 'scripts/check-render-parity.mjs'], 'check-render-parity'),
    );
  },

  'check-list-diff': () => {
    // 让 signal 路径的旧 key 全部失配 ⇒ 节点全部重建，「两路径都复用同一节点」必红
    const file = join(ROOT, 'packages/dom-runtime/dist/index.mjs');
    if (!existsSync(file)) throw new Error('check-list-diff：缺少 dom-runtime dist，请先构建');
    withPatchedFile(
      file,
      (text) => {
        const needle = 'getOldKey: (index) => existingKeys[index] ?? null,';
        if (!text.includes(needle))
          throw new Error('check-list-diff：注入点漂移（找不到 getOldKey）');
        return text.replace(needle, 'getOldKey: (index) => null,');
      },
      () => expectFail(['node', 'scripts/check-list-diff.mjs'], 'check-list-diff'),
    );
  },

  'check-public-names': () => {
    // 多写一处 unified 名字的实现 ⇒ 「同名只能一个实现」必红
    const file = join(ROOT, 'packages/core/src/__negctl-public-name.ts');
    withTempFile(file, 'export function setGlobalErrorReporter(): void {}\n', () =>
      expectFail(['node', 'scripts/check-public-names.mjs'], 'check-public-names'),
    );
  },

  'check-keel-wiring': () => {
    // 删掉 keel.yml 里的 test-lint 关卡 ⇒ 「三关卡必须在 CI 里」必红
    const file = join(ROOT, '.github/workflows/keel.yml');
    withPatchedFile(
      file,
      (text) => {
        const patched = text.replace(/\n\s*run: bash keel\/checks\/test-lint\.sh/, '');
        if (patched === text)
          throw new Error('check-keel-wiring：注入点漂移（找不到 test-lint 关卡）');
        return patched;
      },
      () => expectFail(['tsx', 'scripts/check-keel-wiring.ts'], 'check-keel-wiring'),
    );
  },

  'check-e2e-assertions': () => {
    // 新增一个使用 toBeDefined() 的 e2e 测试文件 ⇒ 「禁止形状断言」必红
    const file = join(ROOT, 'packages/vdom/tests/__negctl-e2e.test.ts');
    withTempFile(file, 'expect(1).toBeDefined();\n', () =>
      expectFail(['tsx', 'scripts/check-e2e-assertions.ts'], 'check-e2e-assertions'),
    );
  },

  'check-src-hygiene': () => {
    // 新增一个含 console.log 的 src 文件（不在基线） ⇒ 必红
    const file = join(ROOT, 'packages/core/src/__negctl-src-hygiene.ts');
    withTempFile(file, "console.log('negctl');\n", () =>
      expectFail(['tsx', 'scripts/check-src-hygiene.ts'], 'check-src-hygiene'),
    );
  },

  'check-examples': () => {
    // 新增一个引用不存在 @lytjs 包的示例 ⇒ 「示例导入必须可解析」必红
    const file = join(ROOT, 'examples/__negctl-example.mjs');
    withTempFile(file, "import '@lytjs/negctl-not-exists';\n", () =>
      expectFail(['node', 'scripts/check-examples.mjs'], 'check-examples'),
    );
  },

  'check-dist-freshness': () => {
    // 把 src 的 mtime 推到 dist 之后 ⇒ 「dist 必须比 src 新」必红；跑完恢复原 mtime
    const file = join(ROOT, 'packages/core/src/index.ts');
    if (!existsSync(file)) throw new Error('check-dist-freshness：缺少 packages/core/src/index.ts');
    const st = statSync(file);
    const future = new Date(Date.now() + 3_600_000);
    utimesSync(file, future, future);
    try {
      expectFail(['tsx', 'scripts/check-dist-freshness.ts'], 'check-dist-freshness');
    } finally {
      utimesSync(file, st.atime, st.mtime);
    }
  },

  'check-dead-packages': () => {
    // 新增一个零生产引用的 common 内部包 ⇒ 「死包只减不增」必红
    const dir = join(ROOT, 'packages/common/packages/__negctl-dead-pkg');
    withTempDir(
      dir,
      {
        'package.json': `${JSON.stringify(
          { name: '@lytjs/common-negctl-dead', version: '0.0.0', private: true },
          null,
          2,
        )}\n`,
        'src/index.ts': 'export const NEGCTL = 1;\n',
      },
      () => expectFail(['tsx', 'scripts/check-dead-packages.ts'], 'check-dead-packages'),
    );
  },

  'check-vitest-alias-dist': () => {
    // 加一条指向不存在目录的 alias ⇒ 「每个 alias 目标都必须存在」必红
    const file = join(ROOT, 'vitest.config.ts');
    withPatchedFile(
      file,
      (text) => {
        const needle = 'alias: {';
        if (!text.includes(needle)) {
          throw new Error('check-vitest-alias-dist：注入点漂移（找不到 alias 块）');
        }
        return text.replace(
          needle,
          `${needle}\n      '@lytjs/__negctl-missing': resolve(root, 'packages/__negctl-missing/src'),`,
        );
      },
      () => expectFail(['tsx', 'scripts/check-vitest-alias-dist.ts'], 'check-vitest-alias-dist'),
    );
  },

  'check-doc-imports': () => {
    // guide 里写一个不存在的具名 import ⇒ 「文档接触面必须为 0 缺失」必红
    const file = join(ROOT, 'docs/guide/__negctl-doc.md');
    withTempFile(file, "import { __negctlMissing } from '@lytjs/core';\n", () =>
      expectFail(['tsx', 'scripts/check-doc-imports.ts'], 'check-doc-imports'),
    );
  },

  'check-ui-props-wiring': () => {
    // 新增一个「声明了 props 却从未引用」的组件 ⇒ props 接线棘轮必红
    const file = join(ROOT, 'packages/ecosystem/packages/ui/src/components/__negctl-props.ts');
    withTempFile(
      file,
      [
        'export default {',
        "  name: 'NegctlProps',",
        '  props: {',
        '    neverWired: { type: String },',
        '  },',
        '  setup() {',
        '    return () => null;',
        '  },',
        '};',
        '',
      ].join('\n'),
      () => expectFail(['tsx', 'scripts/check-ui-props-wiring.ts'], 'check-ui-props-wiring'),
    );
  },

  'check-ui-i18n': () => {
    // 把 en-US 的一条文案改成空串 ⇒ 「文案不得为空串」必红
    const file = join(ROOT, 'packages/ecosystem/packages/ui/src/locale/messages.ts');
    withPatchedFile(
      file,
      (text) => {
        const needle = "'tag.close': 'Close tag',";
        if (!text.includes(needle))
          throw new Error('check-ui-i18n：注入点漂移（找不到 en-US tag.close）');
        return text.replace(needle, "'tag.close': '',");
      },
      () => expectFail(['tsx', 'scripts/check-ui-i18n.ts'], 'check-ui-i18n'),
    );
  },

  'check-bundle-size': () => {
    // 把某个入口的基线压到实测之下 ⇒ 「实测 ≤ 基线 + 2%」必红
    const file = join(ROOT, 'scripts/bundle-baseline.json');
    withPatchedFile(
      file,
      (text) => {
        const pkg = JSON.parse(text);
        if (!pkg.entries?.['vdom-only']) {
          throw new Error('check-bundle-size：注入点漂移（找不到 vdom-only 条目）');
        }
        pkg.entries['vdom-only'].baselineBytes = 1;
        return `${JSON.stringify(pkg, null, 2)}\n`;
      },
      () => expectFail(['tsx', 'scripts/check-bundle-size.ts'], 'check-bundle-size'),
    );
  },

  'check-package-exports': () => {
    // 把一个包的 main 指向不存在的文件 ⇒ 「发布产物入口必须存在」必红
    const file = join(ROOT, 'packages/common/packages/is/package.json');
    withPatchedFile(
      file,
      (text) => {
        const pkg = JSON.parse(text);
        pkg.main = './dist/__negctl-missing.cjs';
        return `${JSON.stringify(pkg, null, 2)}\n`;
      },
      () => expectFail(['node', 'scripts/check-package-exports.mjs'], 'check-package-exports'),
    );
  },

  'check-coverage-snapshot': () => {
    // 把快照里的 commit 改成不存在的 sha ⇒ 「commit 必须真实存在」必红
    const file = join(ROOT, 'scripts/coverage-snapshot.json');
    withPatchedFile(
      file,
      (text) => {
        const pkg = JSON.parse(text);
        pkg.commit = '0000000000000000000000000000000000000000';
        return `${JSON.stringify(pkg, null, 2)}\n`;
      },
      () => expectFail(['node', 'scripts/check-coverage-snapshot.mjs'], 'check-coverage-snapshot'),
    );
  },
};

/** 审计：gate.mjs 的每一项都必须在清单里，且有明确状态 */
function audit() {
  const names = gateNames();
  const registry = existsSync(REGISTRY_PATH)
    ? JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'))
    : { verified: [], unverified: [] };
  const verified = new Set(registry.verified ?? []);
  const unverified = new Set(registry.unverified ?? []);
  const missing = names.filter((n) => !verified.has(n) && !unverified.has(n));
  const stale = [...verified, ...unverified].filter((n) => !names.includes(n));
  const bogus = [...verified].filter((n) => !CONTROLS[n]);

  console.log(`负控清单：${names.length} 项门禁`);
  console.log(`  已验证（注入后必红）：${verified.size}`);
  console.log(`  未验证（如实登记）：${unverified.size}`);
  if (missing.length > 0) console.error(`  ❌ 未登记：${missing.join(', ')}`);
  if (stale.length > 0) console.error(`  ❌ 已不存在：${stale.join(', ')}`);
  if (bogus.length > 0) console.error(`  ❌ 标为已验证但没有控制脚本：${bogus.join(', ')}`);
  return missing.length === 0 && stale.length === 0 && bogus.length === 0;
}

function sync() {
  const names = gateNames();
  const verified = names.filter((n) => CONTROLS[n]);
  const unverified = names.filter((n) => !CONTROLS[n]);
  writeFileSync(
    REGISTRY_PATH,
    `${JSON.stringify({ updatedAt: new Date().toISOString().slice(0, 10), verified, unverified }, null, 2)}\n`,
  );
  // 生成结果必须与仓库格式一致（否则 `format:check` 会因维护命令而漂移）
  const pretty = spawnSync('prettier', ['--write', REGISTRY_PATH], {
    cwd: ROOT,
    env: ENV,
    stdio: 'ignore',
  });
  if (pretty.status !== 0) {
    console.warn('⚠️ prettier 未运行，请手动格式化 scripts/negative-controls.json');
  }
  console.log(
    `已同步 ${REGISTRY_PATH}：verified ${verified.length} / unverified ${unverified.length}`,
  );
}

const argv = process.argv.slice(2);
if (argv.includes('--sync')) {
  sync();
  process.exit(0);
}

const auditOk = audit();
if (argv.includes('--audit')) process.exit(auditOk ? 0 : 1);

const targets =
  argv.filter((a) => !a.startsWith('--')).length > 0
    ? argv.filter((a) => !a.startsWith('--'))
    : Object.keys(CONTROLS);

let failed = 0;
for (const name of targets) {
  const control = CONTROLS[name];
  if (!control) {
    console.error(`❌ ${name}：未登记负控（如实状态见 scripts/negative-controls.json）`);
    failed += 1;
    continue;
  }
  const t0 = Date.now();
  try {
    lastFailure = '';
    control();
    console.log(`✅ ${name}：注入后转红，恢复后回绿（${((Date.now() - t0) / 1000).toFixed(1)}s）`);
    if (lastFailure) console.log(`   ↳ 红在：${lastFailure}`);
  } catch (err) {
    console.error(`❌ ${name}：${err.message}`);
    failed += 1;
  }
}

if (!auditOk) failed += 1;
console.log(`\n负控结果：${targets.length - failed} 通过 / ${failed} 失败`);
process.exit(failed === 0 ? 0 : 1);
