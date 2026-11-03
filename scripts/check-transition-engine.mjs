#!/usr/bin/env node
/**
 * 门禁：过渡引擎（`@lytjs/common-transition-engine`）
 *
 * ## 为什么需要这一项
 *
 * 过渡是**最容易「看起来在工作」**的一层：元素该出现的出现了、该消失的消失了，
 * 但如果 `done` 没被调用，元素只是**没被移除**——它还在 DOM 里，只是不可见或
 * 被下一次渲染覆盖。这类缺陷的表现是「偶尔残留一个节点」「离开的元素还能被点到」，
 * 单测几乎抓不到（单测只断言类名加没加）。
 *
 * 而这一层有两个「出口」必须成对：
 *   · `finishEnter` / `finishLeave` 必须**一定**调用 `done`（调用方靠它移除元素）；
 *   · `cancelTransition` 必须**把类清干净**（否则元素永久带着 `-active` 类）。
 *
 * ## 2026-11-03 首次运行抓到的 4 个缺陷（修复前实测）
 *
 * | # | 缺陷 | 实测 |
 * |---|---|---|
 * | 1 | 用户钩子抛错**阻断 `done()`** | `onAfterEnter` 抛错 ⇒ `done` 不调用、`phase` 停在 `entering` ⇒ **元素永不移除** |
 * | 2 | 取消过渡**不清类名** | 取消后元素仍带 `v-enter-active` / `v-enter-to` |
 * | 3 | 时长为 0 的过渡要**等满 5 秒超时** | `duration=0, hasTransition=true` ⇒ 不立即完成，挂一个 5000ms 定时器 |
 * | 4 | `dispose()` 只重置状态表 | 挂起的定时器照常到点执行、`transitionend` 监听不摘 |
 *
 * 另：`state.props` 在收敛后不释放（元素存活期间一直持有整份 props）；
 * 清理函数表是**模块级** WeakMap（两个引擎操作同一元素会互相覆盖）。
 *
 * 判据用**假 RendererHost**：定时器手动推进、事件手动派发，完全确定性。
 */

const ROOT = process.cwd();
const { TransitionEngine } = await import(
  `${ROOT}/packages/common/packages/transition-engine/dist/index.mjs`
);

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
// 假 RendererHost
// ══════════════════════════════════════════════════════════
function createHost(info = { duration: 300, hasTransition: true, hasAnimation: false }) {
  const timers = new Map();
  const listeners = new Map();
  const styles = [];
  const rects = [];
  let seq = 0;

  const host = {
    addClass: (el, cls) => el.classes.add(cls),
    removeClass: (el, cls) => el.classes.delete(cls),
    hasClass: (el, cls) => el.classes.has(cls),
    setStyle: (el, prop, value) => {
      el.style = el.style || {};
      el.style[prop] = value;
      styles.push([prop, value]);
    },
    removeStyle: (el, prop) => {
      if (el.style) delete el.style[prop];
    },
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    forceReflow: () => {
      host.reflows++;
    },
    addEventListener: (el, type, fn) => {
      listeners.set(`${type}`, fn);
      return () => listeners.delete(type);
    },
    removeEventListener: () => {},
    getBoundingClientRect: () => {
      const r = rects.shift();
      return r ?? { left: 0, top: 0, width: 10, height: 10, right: 10, bottom: 10 };
    },
    getAttribute: () => null,
    getTransitionInfo: () => info,
    nextFrame: (fn) => setTimeout(fn, 0),
    setTimeout: (fn, ms) => {
      const id = ++seq;
      timers.set(id, { fn, ms });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
    getNamespaceURI: () => null,
    replaceChild: () => {},
    getChildNodes: () => [],
    getNodeType: () => 1,
    getTagName: () => 'div',
    createElement: () => ({ classes: new Set(), style: {} }),
    createText: () => ({}),
    createComment: () => ({}),
    setElementText: () => {},
    setText: () => {},
    insert: () => {},
    remove: () => {},
    nextSibling: () => null,
    parentNode: () => null,
    querySelector: () => null,
    patchProp: () => {},
    reflows: 0,
  };

  host.el = () => ({ classes: new Set(), style: {} });
  host.pendingTimers = () => [...timers.values()].map((t) => t.ms);
  host.runTimers = () => {
    const entries = [...timers.entries()];
    timers.clear();
    for (const [, t] of entries) t.fn();
  };
  host.fire = (type, target, currentTarget) => {
    const fn = listeners.get(type);
    if (fn) fn({ type, target, currentTarget });
  };
  host.hasListener = (type) => listeners.has(type);
  host.styles = styles;
  host.pushRect = (r) => rects.push(r);
  return host;
}

// ══════════════════════════════════════════════════════════
section('[1] enter：类名流程与收敛');
{
  const host = createHost();
  const engine = new TransitionEngine(host);
  const el = host.el();
  let doneCount = 0;
  const after = [];

  engine.performEnter(el, { onAfterEnter: (e) => after.push(e) }, () => doneCount++);

  check('enter 期间标记为 transitioning', engine.isTransitioning(el) === true);
  check(
    'enter 起始只保留 active + to（from 已被移除）',
    el.classes.has('v-enter-active') &&
      el.classes.has('v-enter-to') &&
      !el.classes.has('v-enter-from'),
    [...el.classes],
  );
  check('强制回流被调用（保证初始状态被浏览器记录）', host.reflows >= 1, host.reflows);

  host.fire('transitionend', el, el);
  check('transitionend 后收敛', engine.isTransitioning(el) === false);
  check('onAfterEnter 调用一次', after.length === 1);
  check('done 调用一次（调用方靠它移除/收尾）', doneCount === 1, doneCount);
  check('收敛后类名清空', el.classes.size === 0, [...el.classes]);

  // 幂等：再来一次事件不应重复回调
  host.fire('transitionend', el, el);
  check('重复事件不重复 onAfterEnter', after.length === 1, after.length);

  // 兜底路径：**事件永远不触发**时，也必须按 duration + 50ms 收敛（否则元素永久卡住）
  const host2 = createHost({ duration: 300, hasTransition: true, hasAnimation: false });
  const engine2 = new TransitionEngine(host2);
  const el2 = host2.el();
  let fallbackDone = 0;
  engine2.performEnter(el2, {}, () => fallbackDone++);
  check(
    '无事件时挂的是 duration+50 的兜底定时器',
    host2.pendingTimers().includes(350),
    host2.pendingTimers(),
  );
  host2.runTimers();
  check('兜底定时器到点后收敛', fallbackDone === 1, fallbackDone);
}

// ══════════════════════════════════════════════════════════
section('[2] leave：done 必须触发（否则元素永不移除）');
{
  const host = createHost();
  const engine = new TransitionEngine(host);
  const el = host.el();
  let doneCount = 0;
  const afterLeave = [];

  engine.performLeave(el, { onAfterLeave: () => afterLeave.push(1) }, () => doneCount++);
  check(
    'leave 起始带 active + to',
    el.classes.has('v-leave-active') && el.classes.has('v-leave-to'),
    [...el.classes],
  );

  host.fire('transitionend', el, el);
  check('leave 的 done 调用一次', doneCount === 1, doneCount);
  check('onAfterLeave 调用一次', afterLeave.length === 1);
  check('leave 收敛后类名清空', el.classes.size === 0, [...el.classes]);
}

// ══════════════════════════════════════════════════════════
section('[3] 子元素冒泡的 transitionend 不能结束父元素的过渡');
{
  const host = createHost();
  const engine = new TransitionEngine(host);
  const el = host.el();
  const child = host.el();
  let doneCount = 0;

  engine.performEnter(el, {}, () => doneCount++);
  host.fire('transitionend', child, el);
  check('target 不是自身 ⇒ 不结束', doneCount === 0, doneCount);
  check('仍在过渡中', engine.isTransitioning(el) === true);

  host.fire('transitionend', el, el);
  check('自身事件才结束', doneCount === 1);
}

// ══════════════════════════════════════════════════════════
section('[4] JS 钩子路径：onEnter(el, done) 由用户决定何时完成');
{
  const host = createHost();
  const engine = new TransitionEngine(host);
  const el = host.el();
  let doneCount = 0;
  let manualDone = null;

  engine.performEnter(el, { onEnter: (_el, done) => (manualDone = done) }, () => doneCount++);
  check('有 JS 钩子时不挂 CSS 定时器', host.pendingTimers().length === 0, host.pendingTimers());
  check('用户未调 done 前不完成', doneCount === 0);

  manualDone();
  check('用户调 done 后完成', doneCount === 1);
  check('JS 钩子路径也会清类名', el.classes.size === 0, [...el.classes]);
}

// ══════════════════════════════════════════════════════════
section('[5] 时长为 0：立即完成（此前要等满 5 秒超时）');
{
  const host = createHost({ duration: 0, hasTransition: true, hasAnimation: false });
  const engine = new TransitionEngine(host);
  const el = host.el();
  let doneCount = 0;

  engine.performLeave(el, {}, () => doneCount++);
  check('duration=0 立即完成', doneCount === 1, doneCount);
  check('不残留 5 秒定时器', host.pendingTimers().length === 0, host.pendingTimers());
  check('收敛后 phase 为 idle', engine.getState(el).phase === 'idle', engine.getState(el).phase);
}

// ══════════════════════════════════════════════════════════
section('[6] 无过渡声明：立即完成');
{
  const host = createHost({ duration: 0, hasTransition: false, hasAnimation: false });
  const engine = new TransitionEngine(host);
  const el = host.el();
  let doneCount = 0;
  engine.performEnter(el, {}, () => doneCount++);
  check('hasTransition=false 立即完成', doneCount === 1);
  check('不挂定时器', host.pendingTimers().length === 0, host.pendingTimers());
}

// ══════════════════════════════════════════════════════════
section('[7] 取消：清类名、不调 done、调取消钩子');
{
  const host = createHost();
  const engine = new TransitionEngine(host);
  const el = host.el();
  const cancelled = [];
  let doneCount = 0;

  engine.performEnter(el, { onEnterCancelled: () => cancelled.push('enter') }, () => doneCount++);
  engine.cancelTransition(el);

  check('取消后类名清空（此前残留 active/to）', el.classes.size === 0, [...el.classes]);
  check('取消后不调用 done（元素不因此被移除）', doneCount === 0, doneCount);
  check('取消后 phase 为 idle', engine.getState(el).phase === 'idle');
  check('onEnterCancelled 被调用', cancelled.length === 1, cancelled);

  // 取消后能重新开始
  engine.performEnter(el, {}, () => doneCount++);
  host.fire('transitionend', el, el);
  check('取消后重新进入可正常完成', doneCount === 1, doneCount);

  // leave 的取消钩子
  const host2 = createHost();
  const engine2 = new TransitionEngine(host2);
  const el2 = host2.el();
  const leaveCancelled = [];
  engine2.performLeave(el2, { onLeaveCancelled: () => leaveCancelled.push(1) }, () => {});
  engine2.cancelTransition(el2);
  check('onLeaveCancelled 被调用', leaveCancelled.length === 1);
  check('leave 取消后类名清空', el2.classes.size === 0, [...el2.classes]);
}

// ══════════════════════════════════════════════════════════
section('[8] 用户钩子抛错：不能阻断 done 与状态收敛');
{
  const host = createHost();
  const engine = new TransitionEngine(host);
  const el = host.el();
  let doneCount = 0;

  engine.performEnter(
    el,
    {
      onAfterEnter: () => {
        throw new Error('user hook boom');
      },
    },
    () => doneCount++,
  );
  host.fire('transitionend', el, el);

  check('onAfterEnter 抛错后 done 仍然执行', doneCount === 1, doneCount);
  check('抛错后 phase 回到 idle', engine.getState(el).phase === 'idle', engine.getState(el).phase);
  check('抛错后类名仍被清理', el.classes.size === 0, [...el.classes]);

  // leave 同理
  const host2 = createHost();
  const engine2 = new TransitionEngine(host2);
  const el2 = host2.el();
  let leaveDone = 0;
  engine2.performLeave(
    el2,
    {
      onAfterLeave: () => {
        throw new Error('boom');
      },
    },
    () => leaveDone++,
  );
  host2.fire('transitionend', el2, el2);
  check('onAfterLeave 抛错后 done 仍执行', leaveDone === 1, leaveDone);
}

// ══════════════════════════════════════════════════════════
section('[9] 状态清理：props 释放、dispose 撤定时器');
{
  const host = createHost();
  const engine = new TransitionEngine(host);
  const el = host.el();

  engine.performEnter(el, { name: 'x', onAfterEnter: () => {} }, () => {});
  check('进行中持有 props（取消时要用）', engine.getState(el).props !== undefined);
  host.fire('transitionend', el, el);
  check('收敛后释放 props（此前一直持有）', engine.getState(el).props === undefined);

  const host2 = createHost();
  const engine2 = new TransitionEngine(host2);
  const el2 = host2.el();
  let doneCount = 0;
  engine2.performEnter(el2, {}, () => doneCount++);
  check('进行中挂了定时器', host2.pendingTimers().length === 1, host2.pendingTimers());
  engine2.dispose();
  check('dispose 后定时器被撤掉', host2.pendingTimers().length === 0, host2.pendingTimers());
  check('dispose 后事件监听被摘掉', host2.hasListener('transitionend') === false);
  host2.runTimers();
  check('dispose 后即使定时器跑了也不回调', doneCount === 0, doneCount);
}

// ══════════════════════════════════════════════════════════
section('[10] FLIP');
{
  const host = createHost();
  const engine = new TransitionEngine(host);
  const el = host.el();

  let updated = 0;
  host.pushRect({ left: 0, top: 0, width: 10, height: 10, right: 10, bottom: 10 });
  host.pushRect({ left: 50, top: 20, width: 10, height: 10, right: 60, bottom: 30 });
  engine.flip(el, () => {
    updated++;
  });

  check('flip 执行了更新函数', updated === 1);
  check(
    'invert 用 translate 表达',
    host.styles.some(([p, v]) => p === 'transform' && v.includes('translate(-50px, -20px)')),
    host.styles,
  );
  check(
    'Play 阶段设置了 transition',
    host.styles.some(([p, v]) => p === 'transition' && String(v).includes('300ms')),
    host.styles,
  );

  host.runTimers();
  check(
    '动画结束后清理 transition/transform',
    host.styles.filter(([p]) => p === 'transition').pop()[1] === '',
  );

  const off = new TransitionEngine(host, { enableFLIP: false });
  let updated2 = 0;
  off.flip(el, () => {
    updated2++;
  });
  check('enableFLIP=false 仍执行更新函数', updated2 === 1);
}

// ══════════════════════════════════════════════════════════
console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
