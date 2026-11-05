#!/usr/bin/env node
/**
 * 门禁：开发期诊断通道（warn / warnOnce / getDevMode）
 *
 * ## 为什么需要这一项
 *
 * `@lytjs/common-error` 的 `warn()` / `warnOnce()` 是全框架**唯一的诊断出口** ——
 * 全仓 243 个调用点、91 个文件（prop 冲突、无效 prop、循环 mixin、不安全属性被拦截、
 * v-html 非字符串、重复创建渲染器……）。
 *
 * 而它的构建把 `__DEV__` **编译成了 `false`**，于是产物里是：
 *
 *     function warn(message) { return; }
 *     function warnOnce(message) { return; }
 *
 * ⇒ **整个诊断通道在发布产物里是死的**。实测：`warn('x')` 输出 0 次，而 `error()` 正常。
 *
 * 这个缺陷不会让任何行为断言变红（DOM 照样正确、功能照样可用），只会让**排查信息消失**。
 * 唯一可见的症状是 8 条「应当告警」的用例长期是红的
 * （`@lytjs/common-dom` 4 条、`@lytjs/vdom` 4 条）—— 而它们看起来像「测试写错了」。
 *
 * ## 判据设计
 *
 * 1. **行为**：从 **dist** 调用 `warn`，看 `console.warn` 是否真的收到；
 *    再用 `NODE_ENV=production` 做反向对照（必须静默）。
 * 2. **源码守卫**：`tsup.config.ts` 不得再把 `__DEV__` 定义成常量
 *    —— 否则这个缺陷会被「重新引入」，而行为断言在测试环境里（vitest 自己 define 了
 *    `__DEV__: true`）**看不出区别**。
 * 3. **产物守卫**：dist 里不得出现 `function warn(message) { return; }` 这种形态。
 * 4. **端到端**：走一条真实的调用点（`safeExec` 的失败告警），证明「调用点 → warn → 输出」
 *    整条链是通的。
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const PKG = join(ROOT, 'packages/common/packages/error');

let pass = 0;
let fail = 0;
const failures = [];
const check = (name, ok, detail) => {
  if (ok) {
    pass++;
    console.log(`   ✅ ${name}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`   ❌ ${name}`);
    if (detail !== undefined) {
      console.log(`         → ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
    }
  }
};
const section = (t) => console.log(`\n${t}`);

const mod = await import(`${PKG}/dist/index.mjs`);

/** 捕获一次调用期间的 console 输出（默认只捕获 warn；`error()` 走 console.error） */
function capture(fn, method = 'warn') {
  const calls = [];
  const original = console[method];
  console[method] = (...args) => calls.push(args.map(String).join(' '));
  const restore = () => {
    console[method] = original;
    return calls;
  };
  try {
    const result = fn();
    if (result && typeof result.then === 'function') return result.then(restore, restore);
  } catch (error) {
    restore();
    throw error;
  }
  return restore();
}

const withNodeEnv = (value, fn) => {
  const previous = process.env.NODE_ENV;
  if (value === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = value;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
};

// ══════════════════════════════════════════════════════════
section('[1] 产物守卫：warn / warnOnce 不能是空函数');
{
  const dist = readFileSync(join(PKG, 'dist/index.mjs'), 'utf-8');
  // 缺陷形态：function warn(message) { return; }
  const emptyWarn = /function warn\(message\)\s*\{\s*return;\s*\}/.test(dist);
  check('dist 里 warn 不是 `{ return; }` 空函数', !emptyWarn);
  const emptyWarnOnce = /function warnOnce\(message\)\s*\{\s*return;\s*\}/.test(dist);
  check('dist 里 warnOnce 不是 `{ return; }` 空函数', !emptyWarnOnce);
  check('dist 里 warn 真的调用 console.warn', /console\.warn\(/.test(dist));
}

// ══════════════════════════════════════════════════════════
section('[2] 源码守卫：构建不得把 __DEV__ 编译成常量');
{
  const tsup = readFileSync(join(PKG, 'tsup.config.ts'), 'utf-8');
  // 去掉注释再判，说明文字里会引用旧写法
  const codeOnly = tsup.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const bakesConstant = /__DEV__\s*:\s*'(true|false)'/.test(codeOnly);
  check('tsup.config 没有把 __DEV__ 定义成 true/false 常量', !bakesConstant, codeOnly.trim());
  check(
    '源码里没有裸 `if (__DEV__)`（define 去掉后会 ReferenceError）',
    !/\bif\s*\(\s*__DEV__\s*\)/.test(
      readFileSync(join(PKG, 'src/index.ts'), 'utf-8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, ''),
    ),
  );
}

// ══════════════════════════════════════════════════════════
section('[3] 默认环境（非 production）必须输出');
{
  const calls = withNodeEnv(undefined, () => capture(() => mod.warn('这是一条开发期警告')));
  check('warn 有输出（此前恒为 0 次）', calls.length === 1, calls);
  check('输出带 `[LytJS]: ` 前缀', calls[0]?.startsWith('[LytJS]: '), calls[0]);
  check('消息体保留', calls[0]?.includes('这是一条开发期警告'), calls[0]);
}

// ══════════════════════════════════════════════════════════
section('[4] production 必须静默（反向对照）');
{
  const calls = withNodeEnv('production', () => capture(() => mod.warn('生产环境不应出现')));
  check('NODE_ENV=production 时 warn 无输出', calls.length === 0, calls);
}

// ══════════════════════════════════════════════════════════
section('[5] warnOnce：同一消息只输出一次');
{
  const calls = withNodeEnv(undefined, () =>
    capture(() => {
      mod.warnOnce('只出现一次');
      mod.warnOnce('只出现一次');
      mod.warnOnce('只出现一次');
    }),
  );
  check('三次相同消息只输出一次', calls.length === 1, calls);
}

// ══════════════════════════════════════════════════════════
section('[6] setDevMode 必须真的生效（此前完全无效）');
{
  const on = withNodeEnv('production', () =>
    capture(() => {
      mod.setDevMode(true);
      mod.warn('强制打开');
    }),
  );
  check('production 下 setDevMode(true) 能打开警告', on.length === 1, on);

  const off = withNodeEnv(undefined, () =>
    capture(() => {
      mod.setDevMode(false);
      mod.warn('强制关闭');
    }),
  );
  check('dev 下 setDevMode(false) 能关闭警告', off.length === 0, off);

  mod.setDevMode(true);
  check('getDevMode() 反映 setDevMode 的值', mod.getDevMode() === true);
  mod.setDevMode(false);
  check('getDevMode() 再次反映', mod.getDevMode() === false);
  // 复位：不要影响后续断言
  delete globalThis.__DEV__;
  mod.setDevMode(undefined);
}

// ══════════════════════════════════════════════════════════
section('[7] error 在 production 下仍然输出（诊断通道不能整体静音）');
{
  const calls = withNodeEnv('production', () =>
    capture(() => {
      mod.error('生产环境也要报错');
    }, 'error'),
  );
  check('error 在 production 下仍有输出（走 console.error）', calls.length === 1, calls);
}

// ══════════════════════════════════════════════════════════
section('[7b] 宿主注入的 globalThis.__DEV__ 也要生效');
{
  const silent = withNodeEnv(undefined, () => {
    globalThis.__DEV__ = false;
    try {
      return capture(() => mod.warn('宿主关掉了'));
    } finally {
      delete globalThis.__DEV__;
    }
  });
  check('globalThis.__DEV__ = false 时静默', silent.length === 0, silent);

  const loud = withNodeEnv('production', () => {
    globalThis.__DEV__ = true;
    try {
      return capture(() => mod.warn('宿主打开了'));
    } finally {
      delete globalThis.__DEV__;
    }
  });
  check('globalThis.__DEV__ = true 时输出（即使 NODE_ENV=production）', loud.length === 1, loud);
}

// ══════════════════════════════════════════════════════════
section('[8] 端到端：真实调用点 → warn → 输出');
{
  const calls = withNodeEnv(undefined, () =>
    capture(() => {
      mod.safeExec(
        () => {
          throw new Error('boom');
        },
        0,
        '测试上下文',
      );
    }),
  );
  check('safeExec 失败时会告警', calls.length === 1, calls);
  check('告警里带上上下文', calls[0]?.includes('测试上下文'), calls[0]);
  check('告警里带上原始错误消息', calls[0]?.includes('boom'), calls[0]);

  const prodCalls = withNodeEnv('production', () =>
    capture(() => {
      mod.safeExec(
        () => {
          throw new Error('boom');
        },
        0,
        '测试上下文',
      );
    }),
  );
  check('production 下同一条路径不告警（但返回值不变）', prodCalls.length === 0, prodCalls);
}

// ══════════════════════════════════════════════════════════
section('[9] 文档承诺的开关：应用侧 `define: { __DEV__: true }` 必须生效');
{
  // 根 README 写着「若仍想配置，以 Vite 为例：define: { __DEV__: 'true' }」。
  // 而修复前这句话是**做不到**的：警告调用点与 `warn` 本体都在**预编译的产物**里，
  // `__DEV__` 早已被替换成 `false`，应用侧再怎么 define 也改不回来。
  const { build } = await import('esbuild');
  const { tmpdir } = await import('node:os');
  const { mkdtempSync } = await import('node:fs');

  const bundleWith = async (dev) => {
    const dir = mkdtempSync(join(tmpdir(), 'lyt-devwarn-'));
    const outfile = join(dir, 'app.mjs');
    await build({
      stdin: {
        contents: `import { warn, getDevMode } from '${join(PKG, 'dist/index.mjs')}';
warn('来自打包产物的警告');
globalThis.__LYT_DEV__ = getDevMode();`,
        resolveDir: ROOT,
        loader: 'js',
      },
      bundle: true,
      format: 'esm',
      platform: 'node',
      outfile,
      define: { __DEV__: dev },
      logLevel: 'error',
    });
    const calls = capture(async () => {
      await import(`${outfile}?t=${Date.now()}`);
    });
    return { calls: await calls, dev: globalThis.__LYT_DEV__ };
  };

  const on = await bundleWith('true');
  check('define __DEV__=true 后 warn 有输出（README 承诺的开关）', on.calls.length === 1, on.calls);
  check('define __DEV__=true 后 getDevMode() 为 true', on.dev === true, on.dev);

  const off = await bundleWith('false');
  check('define __DEV__=false 后 warn 静默', off.calls.length === 0, off.calls);
  check('define __DEV__=false 后 getDevMode() 为 false', off.dev === false, off.dev);
  delete globalThis.__LYT_DEV__;
}

// ══════════════════════════════════════════════════════════
section('[10] 浏览器开发模式：`getDevMode()` 不能因为「没有 process」就判成生产');
{
  // ⚠️ 2026-11-04 修（P1）：旧实现用 `typeof process !== 'undefined'` 守卫，
  //   而浏览器里 process 不存在 ⇒ 守卫短路 ⇒ 打包器**替换后的 NODE_ENV 字面量**
  //   永远用不上 ⇒ 浏览器开发模式一条警告都不打印（Node 里却正常）。
  //   判据：真的用 esbuild 打一个「浏览器包」，在**没有 process** 的 vm 上下文里跑。
  const { build } = await import('esbuild');
  const vm = await import('node:vm');

  const runInBrowserLike = async (env) => {
    const out = await build({
      stdin: {
        contents: `import { warn } from '${join(PKG, 'dist/index.mjs')}';\nwarn('BROWSER_DEV_PROBE');`,
        resolveDir: ROOT,
        loader: 'js',
      },
      bundle: true,
      format: 'iife',
      globalName: 'LYT_PROBE',
      platform: 'browser',
      write: false,
      logLevel: 'error',
      define: { 'process.env.NODE_ENV': JSON.stringify(env) },
    });
    const code = out.outputFiles[0].text;
    const calls = [];
    // 全新的 vm 上下文里**没有 process**（浏览器就是这样）
    vm.runInNewContext(code, {
      console: { warn: (...args) => calls.push(args.map(String).join(' ')) },
    });
    return calls.filter((line) => line.includes('BROWSER_DEV_PROBE')).length;
  };

  let devCount = -1;
  let prodCount = -1;
  let devError = '';
  try {
    devCount = await runInBrowserLike('development');
    prodCount = await runInBrowserLike('production');
  } catch (error) {
    devError = String(error?.message || error).slice(0, 400);
  }

  check(
    '浏览器 dev 构建（NODE_ENV=development、无 process）⇒ warn 有输出',
    devCount === 1,
    devError || devCount,
  );
  check('浏览器 prod 构建（NODE_ENV=production）⇒ warn 静默', prodCount === 0, prodCount);
}

// ══════════════════════════════════════════════════════════
section('[11] 「必须不静默」的告警不能被构建删掉（产物级守卫）');
{
  // 这 3 条是「功能没生效」的唯一线索：用户会以为它正常，实际什么都没发生。
  // 它们此前被 `if (__DEV__)` 包住，而各包的构建把 `__DEV__` 烘成 `false`
  // ⇒ 产物里整段删除 ⇒ 4 条 core 用例长期红着。
  const cases = [
    ['尚未实现：新元素会与旧元素', 'Transition mode="in-out" 未实现'],
    ['只能作用于**单个**元素或组件', 'Transition 收到多个子节点'],
    ['但没有可用的模板编译器', 'template 没有编译器'],
  ];
  const dist = readFileSync(join(ROOT, 'packages/component/dist/index.mjs'), 'utf-8');
  // esbuild 默认把非 ASCII 转义成 `\uXXXX`（charset: ascii）⇒ 两种形态都要认
  const asciiEscaped = (text) =>
    Array.from(text)
      .map((ch) =>
        ch.charCodeAt(0) > 0x7f
          ? `\\u${ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`
          : ch,
      )
      .join('');
  for (const [needle, label] of cases) {
    const hit = dist.includes(needle) || dist.includes(asciiEscaped(needle));
    check(`component 产物里保留了「${label}」的告警`, hit);
  }

  // 第 4 条：renderer 的 SSR —— 用 template 写组件但服务端没有编译器时，
  // 输出空串（HTTP 200）⇒ 白屏但不报错，这条告警是唯一线索。
  const rendererDist = readFileSync(join(ROOT, 'packages/renderer/dist/index.mjs'), 'utf-8');
  const ssrNeedle = '但服务端没有可用的模板编译器';
  check(
    'renderer 产物里保留了「SSR 无编译器 ⇒ 输出为空」的告警',
    rendererDist.includes(ssrNeedle) || rendererDist.includes(asciiEscaped(ssrNeedle)),
  );
  const rendererSrc = readFileSync(join(ROOT, 'packages/renderer/src/ssr/ssr-island.ts'), 'utf-8');
  check(
    '源码里 SSR 模板告警不再被 `if (__DEV__)` 包住',
    !/if \(__DEV__\) \{\s*\n\s*warn\(\s*\n\s*`组件 "\$\(component\.name/.test(rendererSrc),
  );

  const src = readFileSync(join(ROOT, 'packages/component/src/transition.ts'), 'utf-8');
  check(
    '源码里 mode="in-out" 不再被 `if (__DEV__)` 包住',
    !/if \(__DEV__\s*&&\s*mode === 'in-out'\)/.test(src),
  );
  check(
    '源码里「多个子节点」告警不再被 `if (__DEV__)` 包住',
    !/if \(__DEV__\s*&&\s*count > 1\)/.test(src),
  );
}

// ══════════════════════════════════════════════════════════
section('[12] 不得把 `@lytjs/common-error` 内联进产物（否则 `getDevMode()` 会坍缩成 false）');
{
  // ⚠️ 2026-11-05 修（P1，与第 51 轮同族但换了一层）：
  //
  //   第 51 轮修好了 `getDevMode()` 的**运行时**逻辑（读 NODE_ENV）。但如果某个包在
  //   tsup 里既 `define: { __DEV__: 'false' }`、又**没把 common-error 标成 external**，
  //   esbuild 会把内联进来的这一句折叠掉：
  //
  //     if (typeof __DEV__ === 'boolean') return __DEV__;   // ⇒ return false
  //
  //   于是整条函数坍缩成 `return false`（后面的 `process.env.NODE_ENV` 分支被当成
  //   不可达删除）⇒ **该包所有 `warn()` 在产物里都是哑的**，而单测跑的是 src，全绿。
  //   而且 `setDevMode(true)` 也救不回来 —— 它改的是真身模块里的 `runtimeDevMode`，
  //   内联副本有自己的一份。
  //
  //   实测：`@lytjs/store` 的产物里就是这样（`$patch` 的未知键告警一条都不打印）。
  //   判据：除 `common-error` 自己外，任何产物里都不该出现 `function getDevMode`。
  const { readdirSync } = await import('node:fs');
  const distFiles = [];
  const findDist = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'node_modules') continue;
      const full = join(dir, entry.name);
      if (entry.name === 'dist') {
        const candidate = join(full, 'index.mjs');
        if (existsSync(candidate)) distFiles.push(candidate);
        continue;
      }
      findDist(full);
    }
  };
  findDist(join(ROOT, 'packages'));

  const offenders = [];
  for (const file of distFiles) {
    if (file.includes('/packages/common/packages/error/')) continue;
    const code = readFileSync(file, 'utf-8');
    if (!code.includes('function getDevMode')) continue;
    const at = code.indexOf('function getDevMode');
    const collapsed = !code.slice(at, at + 600).includes('NODE_ENV');
    offenders.push(`${file.slice(ROOT.length + 1)}${collapsed ? '（已坍缩成 return false）' : ''}`);
  }
  check(
    `没有包把 common-error 内联进产物${offenders.length ? `（违规：${offenders.join('; ')}）` : ''}`,
    offenders.length === 0,
    offenders,
  );
}

// ══════════════════════════════════════════════════════════
// 信息性统计（不参与判定）：仍被 `if (__DEV__)` 双门包住的调用点。
// 这些调用点在各自包的产物里被整段删除（那些包的 tsup 把 `__DEV__` 编译成 `false`），
// 属于「已知缺口」——要彻底解决需要 dev/prod 双产物，见评估文档 §29.6。
{
  const { readdirSync } = await import('node:fs');
  let total = 0;
  let doubleGated = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'tests')
        continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (full.endsWith('.ts') && !full.includes('.test.')) {
        const lines = readFileSync(full, 'utf-8').split('\n');
        lines.forEach((line, i) => {
          if (!/\bwarn(Once)?\s*\(/.test(line) || line.includes('export function warn')) return;
          total++;
          if (
            lines
              .slice(Math.max(0, i - 2), i + 1)
              .join('\n')
              .includes('__DEV__')
          )
            doubleGated++;
        });
      }
    }
  };
  walk(join(ROOT, 'packages'));
  console.log(
    `\nℹ️  warn/warnOnce 调用点 ${total} 个，其中 ${doubleGated} 个仍被 ` +
      '`if (__DEV__)` 双门包住（在各包产物里会被整段删除 —— 已知缺口，见 §29.6）',
  );
}

console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
process.exit(0);
