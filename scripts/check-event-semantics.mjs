#!/usr/bin/env node
/* global document */
/**
 * 门禁：事件修饰符语义（两套实现必须一致）
 *
 * ## 为什么需要这一项
 *
 * 同一个语义在本仓有**两份实现**：
 *   · `@lytjs/adapter-web` 的 `patchEvent`（直接操作 DOM，浏览器路径）；
 *   · `@lytjs/common-event-normalizer` 的 `EventNormalizer`（走 `RendererHost`，平台无关路径）。
 *
 * 两份都靠「invoker 缓存 + 只换 value」省掉重复 addEventListener。这套优化的**代价**是：
 * **缓存的假设必须与真实监听状态一致**。一旦不一致，故障形态全是「静默不触发」：
 *
 *   · `.once` 触发后监听已被浏览器摘掉，缓存却还留着 ⇒ 下一次更新只换 value ⇒ **点击彻底失效**；
 *   · 修饰符从 `@click` 变成 `@click.stop` ⇒ 只换 value ⇒ `.stop` **不生效**；
 *   · `.self` 判断写在 `stopPropagation` 之后 ⇒ 子元素点击**仍被阻止冒泡**（外层收不到）。
 *
 * 这些在「单测只看 handler 调没调」的写法下全部通过。
 *
 * ## 2026-11-03 首次运行抓到的 5 个缺陷（修复前实测）
 *
 * | # | 缺陷 | 实测 |
 * |---|---|---|
 * | 1 | `normalizeEventName('online')` → **`line`** | `@online` 永不触发（无报错） |
 * | 2 | `.once` 更新 handler 后**永不触发** | 计数 `[1, 0]`（应为 `[1, 1]`） |
 * | 3 | 修饰符更新不生效 | 改成 `.stop` 后外层仍收到（`1`，应 `0`） |
 * | 4 | `.self` 在 stop 之后判断 | 子元素点击时外层收到 `0`（应 `1`） |
 * | 5 | 值对象 `{once:true}` → `{handler}` 后 once 未取消 | 点两次计数 `1`（应 `2`） |
 *
 * 判据：**同一张场景表分别跑两套实现**，两边的「handler 调用次数 / 冒泡次数」必须相同。
 */

import { JSDOM } from '../node_modules/jsdom/lib/api.js';

const ROOT = process.cwd();

// ── DOM 环境（adapter-web 需要）──────────────────────────────
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
const w = dom.window;
for (const key of ['window', 'document', 'Node', 'Element', 'HTMLElement', 'Event', 'MouseEvent']) {
  globalThis[key] = key === 'window' ? w : w[key];
}

const web = await import(`${ROOT}/packages/adapter-web/dist/index.mjs`);
const { EventNormalizer } = await import(
  `${ROOT}/packages/common/packages/event-normalizer/dist/index.mjs`
);
const { normalizeEventName, getEventKey, parseEventModifier } = await import(
  `${ROOT}/packages/common/packages/events/dist/index.mjs`
);
const dr = await import(`${ROOT}/packages/dom-runtime/dist/index.mjs`);

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
// 两套实现的统一适配层
// ══════════════════════════════════════════════════════════
/** DOM 版：直接用 jsdom 元素 */
function domAdapter() {
  return {
    name: 'adapter-web',
    el: () => document.createElement('div'),
    attach(parent, child) {
      parent.appendChild(child);
    },
    patch: (el, name, value) => web.patchEvent(el, name, value),
    removeAll: (el) => web.removeAllEventListeners(el),
    dispatch: (target, type, init = {}) => {
      // 返回事件对象本身（`dispatchEvent` 的返回值是 boolean，拿不到 defaultPrevented）
      const Ctor = init.key !== undefined ? w.KeyboardEvent : w.MouseEvent;
      const event = new Ctor(type, { bubbles: true, cancelable: true, ...init });
      target.dispatchEvent(event);
      return event;
    },
    on: (el, type, fn) => el.addEventListener(type, fn),
  };
}

/** Host 版：自建最小 DOM 语义（父子链 + 冒泡 + once/capture） */
function hostAdapter() {
  const makeEl = () => ({ children: [], parent: null, listeners: new Map() });
  const host = {
    addEventListener(el, type, fn, options) {
      const list = el.listeners.get(type) ?? [];
      const entry = { fn, options: options ?? {} };
      list.push(entry);
      el.listeners.set(type, list);
      return () => {
        const cur = el.listeners.get(type) ?? [];
        const i = cur.indexOf(entry);
        if (i >= 0) cur.splice(i, 1);
      };
    },
    removeEventListener(el, type, fn, options) {
      const cur = el.listeners.get(type) ?? [];
      const i = cur.findIndex(
        (e) => e.fn === fn && Boolean(e.options?.capture) === Boolean(options?.capture),
      );
      if (i >= 0) cur.splice(i, 1);
    },
    clearTimeout: () => {},
    setTimeout: (fn) => {
      fn();
      return 0;
    },
  };
  const normalizer = new EventNormalizer(host);

  return {
    name: 'event-normalizer',
    el: makeEl,
    attach(parent, child) {
      parent.children.push(child);
      child.parent = parent;
    },
    patch: (el, name, value) => normalizer.patchEvent(el, name, value),
    removeAll: (el) => normalizer.removeAllEventListeners(el),
    dispatch(target, type, init = {}) {
      // 简化冒泡：从 target 一路到根，capture 先、bubble 后
      const path = [];
      for (let node = target; node; node = node.parent) path.push(node);
      const event = {
        type,
        target,
        currentTarget: null,
        propagationStopped: false,
        defaultPrevented: false,
        ...init,
        stopPropagation() {
          this.propagationStopped = true;
        },
        preventDefault() {
          this.defaultPrevented = true;
        },
      };
      // capture：根 → target
      for (let i = path.length - 1; i >= 0 && !event.propagationStopped; i--) {
        event.currentTarget = path[i];
        for (const entry of [...(path[i].listeners.get(type) ?? [])]) {
          if (entry.options?.capture) entry.fn(event);
        }
      }
      // bubble：target → 根
      for (let i = 0; i < path.length && !event.propagationStopped; i++) {
        event.currentTarget = path[i];
        for (const entry of [...(path[i].listeners.get(type) ?? [])]) {
          if (entry.options?.capture) continue;
          entry.fn(event);
          if (entry.options?.once) {
            const cur = path[i].listeners.get(type) ?? [];
            const idx = cur.indexOf(entry);
            if (idx >= 0) cur.splice(idx, 1);
          }
        }
      }
      return event;
    },
    on: (el, type, fn) => host.addEventListener(el, type, fn),
  };
}

// ══════════════════════════════════════════════════════════
section('[1] 事件名规范化（两套实现共用 common-events）');
{
  check(
    'onClick → click',
    normalizeEventName('onClick') === 'click',
    normalizeEventName('onClick'),
  );
  check('@click.stop → click', normalizeEventName('@click.stop') === 'click');
  check('click → click', normalizeEventName('click') === 'click');
  // ⚠️ 此前 'online' 被剥成 'line'
  check(
    'online 不被剥成 line（此前是 line）',
    normalizeEventName('online') === 'online',
    normalizeEventName('online'),
  );
  check(
    'onLine → line（真实事件名是 line? 不：应保持 online 语义）',
    normalizeEventName('onLine') === 'line',
    normalizeEventName('onLine'),
  );
  check('onMouseenter → mouseenter', normalizeEventName('onMouseenter') === 'mouseenter');
  check('getEventKey(click) → onClick', getEventKey('click') === 'onClick');

  const parsed = parseEventModifier('onClick.stop.prevent.capture.once.self.passive');
  check(
    '六个修饰符都能解析',
    parsed.stop && parsed.prevent && parsed.capture && parsed.once && parsed.self && parsed.passive,
    parsed,
  );
}

// ══════════════════════════════════════════════════════════
section('[2] 场景表：两套实现逐条对比');
for (const make of [domAdapter, hostAdapter]) {
  const api = make();
  const tag = `[${api.name}]`;

  // ① .self：子元素点击不触发 handler，且**不能** stopPropagation
  {
    const outer = api.el();
    const mid = api.el();
    const inner = api.el();
    api.attach(outer, mid);
    api.attach(mid, inner);
    let outerHit = 0;
    api.on(outer, 'click', () => outerHit++);
    let handlerHit = 0;
    api.patch(mid, 'onClick.self.stop', () => handlerHit++);

    api.dispatch(inner, 'click');
    check(`${tag} .self：子元素点击不触发 handler`, handlerHit === 0, handlerHit);
    check(`${tag} .self：子元素点击不被 stop（外层应收到）`, outerHit === 1, outerHit);

    api.dispatch(mid, 'click');
    check(`${tag} .self：自身点击触发 handler`, handlerHit === 1, handlerHit);
    check(`${tag} .self + .stop：自身点击阻止冒泡`, outerHit === 1, outerHit);
  }

  // ② .stop / .prevent
  {
    const outer = api.el();
    const el = api.el();
    api.attach(outer, el);
    let outerHit = 0;
    api.on(outer, 'click', () => outerHit++);
    api.patch(el, 'onClick.stop', () => {});
    const ev = api.dispatch(el, 'click');
    check(`${tag} .stop 阻止冒泡`, outerHit === 0, outerHit);

    const el2 = api.el();
    api.patch(el2, 'onClick.prevent', () => {});
    const ev2 = api.dispatch(el2, 'click');
    check(`${tag} .prevent 阻止默认`, ev2.defaultPrevented === true, ev2.defaultPrevented);
    void ev;
  }

  // ③ .once：只触发一次
  {
    const el = api.el();
    let n = 0;
    api.patch(el, 'onClick.once', () => n++);
    api.dispatch(el, 'click');
    api.dispatch(el, 'click');
    check(`${tag} .once 只触发一次`, n === 1, n);
  }

  // ④ .once + 更新 handler：必须重新武装（此前第二次点击永不触发）
  {
    const el = api.el();
    let a = 0;
    let b = 0;
    api.patch(el, 'onClick.once', () => a++);
    api.dispatch(el, 'click');
    api.patch(el, 'onClick.once', () => b++);
    api.dispatch(el, 'click');
    check(`${tag} .once 更新 handler 后重新武装`, a === 1 && b === 1, [a, b]);
  }

  // ⑤ 修饰符更新：click → click.stop 必须生效
  {
    const outer = api.el();
    const el = api.el();
    api.attach(outer, el);
    let outerHit = 0;
    api.on(outer, 'click', () => outerHit++);
    api.patch(el, 'onClick', () => {});
    api.patch(el, 'onClick.stop', () => {});
    api.dispatch(el, 'click');
    check(`${tag} 修饰符更新为 .stop 后生效`, outerHit === 0, outerHit);
  }

  // ⑥ 普通更新：只换 handler，不重复绑定
  {
    const el = api.el();
    let first = 0;
    let second = 0;
    api.patch(el, 'onClick', () => first++);
    api.patch(el, 'onClick', () => second++);
    api.dispatch(el, 'click');
    check(`${tag} 更新 handler 后只有新 handler 执行`, first === 0 && second === 1, [
      first,
      second,
    ]);
  }

  // ⑦ removeAll 之后不再触发
  {
    const el = api.el();
    let n = 0;
    api.patch(el, 'onClick', () => n++);
    api.removeAll(el);
    api.dispatch(el, 'click');
    check(`${tag} removeAllEventListeners 后不再触发`, n === 0, n);
  }

  // ⑧ 传 null 解绑
  {
    const el = api.el();
    let n = 0;
    api.patch(el, 'onClick', () => n++);
    api.patch(el, 'onClick', null);
    api.dispatch(el, 'click');
    check(`${tag} 传 null 后解绑`, n === 0, n);
  }
}

// ══════════════════════════════════════════════════════════
section('[3] adapter-web 专属：值对象形态的选项');
{
  const el = document.createElement('div');
  let n = 0;
  web.patchEvent(el, 'onClick', {
    handler: () => n++,
    once: true,
  });
  web.patchEvent(el, 'onClick', { handler: () => n++ });
  el.dispatchEvent(new w.MouseEvent('click'));
  el.dispatchEvent(new w.MouseEvent('click'));
  check('值对象 {once:true} → {handler} 后 once 取消（点两次计数 2）', n === 2, n);

  const el2 = document.createElement('div');
  let captured = 0;
  web.patchEvent(el2, 'onClick', { handler: () => captured++, capture: true });
  el2.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  check('值对象 {capture:true} 生效', captured === 1, captured);
}

// ══════════════════════════════════════════════════════════
section('[4] 三模式对拍：.enter / .ctrl / .ctrl.exact');
for (const make of [domAdapter, hostAdapter]) {
  const api = make();
  const tag = `[${api.name}]`;

  // ① .enter
  {
    const el = api.el();
    let n = 0;
    api.patch(el, 'onKeyup.enter', () => n++);
    api.dispatch(el, 'keyup', { key: 'Enter' });
    api.dispatch(el, 'keyup', { key: 'a' });
    check(`${tag} .enter 仅 Enter 触发`, n === 1, n);
  }

  // ② .ctrl
  {
    const el = api.el();
    let n = 0;
    api.patch(el, 'onKeydown.ctrl', () => n++);
    api.dispatch(el, 'keydown', { key: 'a', ctrlKey: true });
    api.dispatch(el, 'keydown', { key: 'a' });
    check(`${tag} .ctrl 仅在按下 ctrl 时触发`, n === 1, n);
  }

  // ③ .ctrl.exact（exact 额外拒绝未列出的系统键）
  {
    const el = api.el();
    let n = 0;
    api.patch(el, 'onKeydown.ctrl.exact', () => n++);
    api.dispatch(el, 'keydown', { key: 'a', ctrlKey: true });
    api.dispatch(el, 'keydown', { key: 'a', ctrlKey: true, shiftKey: true });
    check(`${tag} .ctrl.exact 仅 ctrl（无其他系统键）触发`, n === 1, n);
  }
}

// 第三模式：dom-runtime（compiler 产物 withModifiers / Signal createEventHandler 共用同一判定）
{
  const mkEvent = (init) => {
    const event = {
      target: {},
      currentTarget: null,
      defaultPrevented: false,
      ...init,
      preventDefault() {
        this.defaultPrevented = true;
      },
      stopPropagation() {},
    };
    event.currentTarget = event.target;
    return event;
  };

  let n = 0;
  const wrappedEnter = dr.withModifiers(() => n++, ['enter']);
  wrappedEnter(mkEvent({ key: 'Enter' }));
  wrappedEnter(mkEvent({ key: 'a' }));
  check('[dom-runtime/withModifiers] .enter 仅 Enter 触发', n === 1, n);

  let c = 0;
  const wrappedCtrl = dr.withModifiers(() => c++, ['ctrl']);
  wrappedCtrl(mkEvent({ key: 'a', ctrlKey: true }));
  wrappedCtrl(mkEvent({ key: 'a' }));
  check('[dom-runtime/withModifiers] .ctrl 仅在按下 ctrl 时触发', c === 1, c);

  let e = 0;
  const wrappedExact = dr.withModifiers(() => e++, ['ctrl', 'exact']);
  wrappedExact(mkEvent({ key: 'a', ctrlKey: true }));
  wrappedExact(mkEvent({ key: 'a', ctrlKey: true, shiftKey: true }));
  check('[dom-runtime/withModifiers] .ctrl.exact 仅 ctrl 触发', e === 1, e);

  // Signal 路径：对象形态修饰符
  const el = document.createElement('div');
  let s = 0;
  dr.createEventHandler(el, 'keydown', () => s++, { ctrl: true, exact: true });
  el.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'a', ctrlKey: true }));
  el.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'a', ctrlKey: true, shiftKey: true }));
  check('[dom-runtime/createEventHandler] .ctrl.exact 仅 ctrl 触发', s === 1, s);

  const el2 = document.createElement('div');
  let k = 0;
  const off = dr.createEventHandler(el2, 'keyup', () => k++, { enter: true });
  el2.dispatchEvent(new w.KeyboardEvent('keyup', { key: 'Enter' }));
  el2.dispatchEvent(new w.KeyboardEvent('keyup', { key: 'a' }));
  off();
  check('[dom-runtime/createEventHandler] .enter 仅 Enter 触发', k === 1, k);
}

// ══════════════════════════════════════════════════════════
console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
