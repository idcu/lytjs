#!/usr/bin/env node
/**
 * scripts/check-cross-entry-singletons.mjs
 *
 * **门禁：dist 级跨入口单例判据 + 模块级可变状态棘轮**
 *
 * ## 为什么需要它
 *
 * 各包 tsup 都是 `splitting: false`：同一份模块会被**逐入口内联**。于是模块级
 * 可变状态（`let` 开关、`Map/Set/WeakMap` 注册表、普通 `Symbol()` 键）在每个
 * 入口各有一份副本。「入口 A 写、入口 B 读」在源码测试里永远看不到 ——
 * `vitest.shared.ts` 把主入口与子入口都 alias 到 `src`，同进程只有一个模块实例。
 *
 * 本门禁只做两件事：
 *   1. **探针**：同一 Node 进程直接 import `dist/*.mjs`，按显式表「写 A 读 B」，
 *      断言状态共享。探针表是手写的，不自动生成。
 *   2. **棘轮**：扫描 `packages/**\/src/**\/*.ts` 的模块级可变状态，必须全部登记在
 *      `scripts/cross-entry-singletons.json` 并给出 (a)/(b)/(c) 判定与理由；
 *      新增未登记命中、登记项消失，都直接转红。
 *
 * 分类口径：
 *   (a) 只被单入口消费，安全；
 *   (b) 跨入口读写，当前已坏；
 *   (c) 跨入口读写，目前靠运气没暴露。
 *
 * 退出码：0 = 探针全绿且登记表与扫描一致；1 = 有失败探针 / 未登记 / 失效登记。
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_PATH = join(ROOT, 'scripts/cross-entry-singletons.json');

const isConstCollectionName = (name) => /^[A-Z][A-Z0-9_]*$/.test(name);

/** 收集 packages 下所有 src 目录（含嵌套包）。 */
function srcDirs() {
  const out = [];
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'dist') continue;
        walk(p);
      } else if (e.name === 'package.json') {
        out.push(join(dir, 'src'));
      }
    }
  })(join(ROOT, 'packages'));
  return out;
}

function tsFiles(dir) {
  const out = [];
  (function walk(d) {
    let ents;
    try {
      ents = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (
        e.name.endsWith('.ts') &&
        !e.name.endsWith('.d.ts') &&
        !e.name.endsWith('.test.ts')
      ) {
        out.push(p);
      }
    }
  })(dir);
  return out;
}

/**
 * 扫描模块级可变状态。
 * @returns {Map<string, {file: string, line: number, name: string, kind: string}>}
 */
export function scanStates() {
  const files = srcDirs().flatMap(tsFiles);
  const hits = new Map();
  for (const file of files) {
    const rel = relative(ROOT, file);
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      let m = line.match(/^(?:export\s+)?(?:let|var)\s+([A-Za-z_$][\w$]*)/);
      if (m) {
        hits.set(`${rel}::${m[1]}`, { file: rel, line: i + 1, name: m[1], kind: 'let/var' });
        return;
      }
      m = line.match(
        /^(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*new\s+(WeakMap|WeakSet|Map|Set)\b/,
      );
      if (m) {
        // UPPER_SNAKE_CASE 视为只读常量集合（如 HTML_ELEMENTS），不计入可变状态。
        if (!isConstCollectionName(m[1])) {
          hits.set(`${rel}::${m[1]}`, { file: rel, line: i + 1, name: m[1], kind: `new ${m[2]}` });
        }
        return;
      }
      m = line.match(/^(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*Symbol\s*\(/);
      if (m) {
        hits.set(`${rel}::${m[1]}`, { file: rel, line: i + 1, name: m[1], kind: 'Symbol()' });
      }
    });
  }
  return hits;
}

const dist = (p) => pathToFileURL(join(ROOT, p)).href;

/**
 * 显式探针表 —— 每条写清：写哪个入口、读哪个入口、期望什么。
 * 不允许自动生成：探针本身就是「我们认为什么必须共享」的规格。
 */
const PROBES = {
  'compiler.optimized-registry': {
    write: 'compiler/signal-optimized.registerSignalOptimizedGenerator()',
    read: 'compiler.compile({optimizeSignal:true})',
    expect: '主入口 compile 能取到子入口注册的发射器，产物含 `_c.msg`',
    async run() {
      const main = await import(dist('packages/compiler/dist/index.mjs'));
      const sub = await import(dist('packages/compiler/dist/signal-optimized.mjs'));
      sub.registerSignalOptimizedGenerator();
      const { code } = main.compile('<div>{{ msg }}</div>', {
        rendererMode: 'signal',
        optimizeSignal: true,
      });
      return {
        ok: code.includes('_c.msg'),
        detail: code.includes('_c.msg') ? '_c.msg' : '未见 _c.msg',
      };
    },
  },

  'reactivity.effect-main_signal-sub': {
    write: 'reactivity/signal.signal()+set()',
    read: 'reactivity.effect()',
    expect: '子入口创建的 signal 被主入口 effect 订阅：set 后 effect 重跑（runs=2）',
    async run() {
      const main = await import(dist('packages/reactivity/dist/index.mjs'));
      const sub = await import(dist('packages/reactivity/dist/signal.mjs'));
      let runs = 0;
      const s = sub.signal(0);
      const runner = main.effect(() => {
        runs++;
        s();
      });
      sub.set(s, 1);
      try {
        main.stop(runner);
      } catch {
        /* runner 形态差异不参与判定 */
      }
      return { ok: runs === 2, detail: `runs=${runs}（期望 2）` };
    },
  },

  'core.config-main_runtime': {
    write: 'core.setGlobalConfig()',
    read: 'core/runtime.getConfig()',
    expect: '主入口写入的全局配置，/runtime 入口可读回同一个值',
    async run() {
      const main = await import(dist('packages/core/dist/index.mjs'));
      const rt = await import(dist('packages/core/dist/runtime.mjs'));
      main.setGlobalConfig({ __crossEntryProbe: 42 });
      const v = rt.getConfig('__crossEntryProbe');
      return { ok: v === 42, detail: `value=${JSON.stringify(v)}（期望 42）` };
    },
  },

  'renderer.hydration-main_client': {
    write: 'renderer.getServerComponentClientFunctions().markHydrated()',
    read: 'renderer/client.isHydrated()',
    expect: '主入口内联的 client 状态与 /client 入口共享：标记后两端一致',
    async run() {
      const main = await import(dist('packages/renderer/dist/index.mjs'));
      const client = await import(dist('packages/renderer/dist/client/index.mjs'));
      const api = await main.getServerComponentClientFunctions();
      api.markHydrated('cross-entry-probe');
      const v = client.isHydrated('cross-entry-probe');
      return { ok: v === true, detail: `isHydrated=${v}（期望 true）` };
    },
  },

  'vdom.transition-prefix-main_sub': {
    write: 'vdom.setTransitionPrefix()',
    read: 'vdom/transition.performLeaveTransition() 生成的类名',
    expect: '主入口设置的前缀被子入口过渡读取：类名以 `probe-` 开头',
    async run() {
      const main = await import(dist('packages/vdom/dist/index.mjs'));
      const sub = await import(dist('packages/vdom/dist/transition.mjs'));
      const added = [];
      const el = {
        classList: { add: (c) => added.push(c), remove() {}, contains: () => false },
        getBoundingClientRect: () => ({}),
        addEventListener() {},
        removeEventListener() {},
      };
      globalThis.getComputedStyle = () => ({
        transitionDuration: '0s',
        transitionDelay: '0s',
        animationDuration: '0s',
        animationDelay: '0s',
        transitionProperty: 'all',
        getPropertyValue: () => '',
      });
      main.setTransitionPrefix('probe');
      sub.performLeaveTransition(el, { css: true, onLeave: (_el, done) => done() }, () => {});
      main.setTransitionPrefix('v');
      const ok = added.length > 0 && added.every((c) => c.startsWith('probe-'));
      return { ok, detail: `classes=${added.join(',') || '(none)'}` };
    },
  },
};

async function main() {
  const t0 = performance.now();
  const onlyIdx = process.argv.indexOf('--only');
  const only = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
  const states = scanStates();
  const registered = registry.states ?? {};
  const unregistered = [...states.keys()].filter((k) => !registered[k]).sort();
  const stale = Object.keys(registered)
    .filter((k) => !states.has(k))
    .sort();

  const failures = [];
  const skipped = [];
  let passed = 0;

  for (const [id, spec] of Object.entries(registry.probes ?? {})) {
    // `--only <id>`：负控用 —— 只跑指定探针，其他探针的既有红不参与本次退出码。
    if (only && id !== only) continue;
    if (spec.uninjectable) {
      skipped.push({ id, reason: spec.reason });
      continue;
    }
    const impl = PROBES[id];
    if (!impl) {
      failures.push({ id, detail: '登记了探针但没有实现（PROBES 缺项）' });
      continue;
    }
    // 探针实现必须与规格表逐条对应，防止实现漂移后仍沿用旧描述。
    if (impl.write !== spec.write || impl.read !== spec.read) {
      failures.push({ id, detail: '探针实现与规格表的 write/read 不一致' });
      continue;
    }
    try {
      const r = await impl.run();
      if (r.ok) passed++;
      else failures.push({ id, detail: r.detail });
    } catch (e) {
      failures.push({ id, detail: `抛错：${e instanceof Error ? e.message : String(e)}` });
    }
  }

  if (only && !(only in (registry.probes ?? {}))) {
    failures.push({ id: only, detail: '指定的探针未登记在 cross-entry-singletons.json' });
  }

  const counts = { a: 0, b: 0, c: 0 };
  for (const v of Object.values(registered)) {
    if (v.classification in counts) counts[v.classification]++;
  }

  console.log('\n🔍 跨入口单例判据（dist 实测 + 模块级状态棘轮）');
  console.log(
    `   登记 ${Object.keys(registered).length} 项：a=${counts.a} / b=${counts.b} / c=${counts.c}` +
      ` / 不可探针 ${skipped.length}`,
  );
  console.log(`   探针：通过 ${passed} / 失败 ${failures.length} / 不可探针 ${skipped.length}`);

  for (const f of failures) console.log(`   ❌ ${f.id} — ${f.detail}`);
  for (const s of skipped) console.log(`   ⚠️  ${s.id} — 不可探针：${s.reason}`);
  for (const k of unregistered) {
    const h = states.get(k);
    console.log(`   ❌ 未登记模块级状态：${h.file}:${h.line} ${h.name} [${h.kind}]`);
  }
  for (const k of stale) console.log(`   ❌ 登记项已消失：${k}`);

  const bad = failures.length + unregistered.length + stale.length;
  console.log(`   耗时 ${(performance.now() - t0).toFixed(0)} ms`);
  console.log(bad === 0 ? '✅ 跨入口状态共享与登记表全部一致\n' : `❌ ${bad} 项未通过\n`);
  process.exit(bad === 0 ? 0 : 1);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) await main();
