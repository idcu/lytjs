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
import { existsSync, readFileSync, statSync, unlinkSync, utimesSync, writeFileSync } from 'node:fs';
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
  return r.status;
}

/** 临时改写一个文件，跑完（无论成败）恢复原字节 */
function withPatchedFile(file, patch, run) {
  const original = readFileSync(file, 'utf-8');
  try {
    writeFileSync(file, patch(original));
    return run();
  } finally {
    writeFileSync(file, original);
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
    // 恢复内容后再还原 mtime：否则 check-dist-freshness 会因「src 比 dist 新」误红。
    const file = join(ROOT, 'packages/vdom/src/patch.ts');
    const st = statSync(file);
    withPatchedFile(
      file,
      (text) => `${text}\nexport const __negctlAsUnknown = 0 as unknown as string;\n`,
      () => expectFail(['node', 'scripts/check-as-unknown.mjs'], 'check-as-unknown'),
    );
    utimesSync(file, st.atime, st.mtime);
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
    control();
    console.log(`✅ ${name}：注入后转红，恢复后回绿（${((Date.now() - t0) / 1000).toFixed(1)}s）`);
  } catch (err) {
    console.error(`❌ ${name}：${err.message}`);
    failed += 1;
  }
}

if (!auditOk) failed += 1;
console.log(`\n负控结果：${targets.length - failed} 通过 / ${failed} 失败`);
process.exit(failed === 0 ? 0 : 1);
