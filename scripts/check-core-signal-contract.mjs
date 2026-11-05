#!/usr/bin/env node
/* eslint-disable no-undef -- 本脚本刻意在裸 Node 里模拟浏览器全局（见文件头注释） */
/**
 * 门禁：`@lytjs/core-signal` 的 setup 契约与类型诚实（A10）
 *
 * ## 为什么需要这一项
 *
 * Signal 模式的 `createApp` 是一条**独立**的应用路径（不复用 `@lytjs/core` 的
 * 组件实例），因此很多约定只能靠它自己实现。2026-11-05 审计（P1-5）发现：
 *
 *   · `setup(props, {})` —— 第二参是**空对象**：`ctx.inject()` / `ctx.emit()` /
 *     `ctx.expose()` 全部 TypeError，但没有任何类型或运行时提示；
 *   · `app.inject<T>()` 的返回类型写成 `T`，缺键时实际返回 `undefined`
 *     （`return undefined as T`）—— 类型在撒谎；
 *   · `app.component()/directive()/mixin()` 只有 `__DEV__` 下的 `warn()`，
 *     而 `warn()` 在生产构建里被 `getDevMode()` 短路 ⇒ **生产环境完全静默的 no-op**。
 *
 * 本门禁用**运行时行为**断言（不用类型断言），并要求注入验证时变红：
 *   1. setup 第二参具备可调用的 `inject` / `emit` / `expose`；
 *   2. `inject` 缺键返回 `undefined`、有默认值时返回默认值（不伪造值）；
 *   3. `emit` 真正调用 props 上的 `onXxx` 监听器；
 *   4. `expose` 真正限制公共实例的暴露面；
 *   5. 生产产物（`__DEV__: false`）里 `component/directive/mixin` 必须输出错误，
 *      不允许静默 no-op。
 *
 * 退出码：0 = 全部通过；1 = 有失败。
 */
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = process.cwd();
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.Element = dom.window.Element;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.Event = dom.window.Event;
globalThis.MouseEvent = dom.window.MouseEvent;
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: dom.window.navigator,
    configurable: true,
  });
} catch {
  /* 某些 Node 版本 navigator 只读，忽略 */
}
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.__DEV__ = false;

const pkg = (name, entry = 'index.mjs') => join(ROOT, 'packages', name, 'dist', entry);
const { createApp } = await import(pkg('core-signal'));

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

// ══════════════════════════════════════════════════════════
section('[1] setup 第二参：inject / emit / expose 必须真实可用');
{
  const emitted = [];
  const host = document.createElement('div');
  document.body.appendChild(host);

  let captured = null;
  const app = createApp(
    {
      setup(_props, ctx) {
        captured = ctx;
        const theme = ctx.inject('theme');
        const missing = ctx.inject('missing');
        const fallback = ctx.inject('missing', 'fallback');
        ctx.emit('save', { id: 1 });
        ctx.emit('save-item', 2);
        ctx.expose({ exposedValue: 'ok' });
        return { theme, missing, fallback };
      },
      template: '<div>{{ theme }}-{{ fallback }}</div>',
    },
    {
      onSave: (payload) => emitted.push(['save', payload]),
      onSaveItem: (payload) => emitted.push(['saveItem', payload]),
    },
  );
  app.provide('theme', 'dark');

  let mounted = null;
  try {
    mounted = await app.mount(host);
  } catch (e) {
    check('setup 能以真实上下文执行（不抛 TypeError）', false, e instanceof Error ? e.message : e);
  }

  check(
    'setup 第二参不是空对象（inject/emit/expose 可调用）',
    !!captured &&
      typeof captured.inject === 'function' &&
      typeof captured.emit === 'function' &&
      typeof captured.expose === 'function',
    captured && Object.keys(captured),
  );

  check(
    'ctx.inject 读到 app.provide 的值',
    captured?.inject?.('theme') === 'dark',
    captured?.inject?.('theme'),
  );
  check(
    'ctx.inject 缺键返回 undefined（不伪造值）',
    captured?.inject?.('missing') === undefined,
    String(captured?.inject?.('missing')),
  );
  check(
    'ctx.inject 有默认值时返回默认值',
    captured?.inject?.('missing', 'fallback') === 'fallback',
    String(captured?.inject?.('missing', 'fallback')),
  );

  check(
    'ctx.emit 调用 props 上的 onSave',
    emitted.length === 2 && emitted[0][0] === 'save' && emitted[0][1].id === 1,
    emitted,
  );
  check(
    'ctx.emit 把 kebab 事件名映射为 onSaveItem',
    emitted.length === 2 && emitted[1][0] === 'saveItem' && emitted[1][1] === 2,
    emitted,
  );

  check(
    '模板确实渲染出 inject 的返回值',
    host.innerHTML === '<div>dark-fallback</div>',
    host.innerHTML,
  );

  check(
    'ctx.expose 后公共实例只暴露白名单',
    mounted?.exposedValue === 'ok',
    mounted && Object.keys(mounted),
  );
  check('ctx.expose 后未列出的键不再暴露', mounted?.theme === undefined, String(mounted?.theme));

  try {
    app.unmount();
  } catch {
    /* jsdom 下 Element.remove 可能不可用 —— 卸载异常不影响本组断言 */
  }
}

// ══════════════════════════════════════════════════════════
section('[2] app.inject：缺键必须是 undefined（类型与运行时一致）');
{
  const app = createApp({ template: '<div>ok</div>' });
  app.provide('direct', 1);
  check('app.inject 读到已注册值', app.inject('direct') === 1, String(app.inject('direct')));
  check(
    'app.inject 缺键返回 undefined',
    app.inject('nope') === undefined,
    String(app.inject('nope')),
  );
  check(
    'app.inject 缺键 + 默认值返回默认值',
    app.inject('nope', 42) === 42,
    String(app.inject('nope', 42)),
  );
}

// ══════════════════════════════════════════════════════════
section('[3] 生产产物（__DEV__:false）：不支持的注册 API 不得静默');
{
  const app = createApp({ template: '<div>ok</div>' });
  const originalError = console.error;
  const calls = [];
  console.error = (...args) => calls.push(args.join(' '));
  try {
    app.component('my-comp', {});
    app.directive('my-dir', {});
    app.mixin({});
  } finally {
    console.error = originalError;
  }
  const text = calls.join('\n');
  check(
    'app.component() 在生产环境输出错误（非静默）',
    /component\(\).*not supported/i.test(text),
    text,
  );
  check(
    'app.directive() 在生产环境输出错误（非静默）',
    /directive\(\).*not supported/i.test(text),
    text,
  );
  check('app.mixin() 在生产环境输出错误（非静默）', /mixin\(\).*not supported/i.test(text), text);
}

// ══════════════════════════════════════════════════════════
console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
process.exit(0);
