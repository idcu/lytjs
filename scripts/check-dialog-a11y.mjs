#!/usr/bin/env node
/* global document, KeyboardEvent */
/**
 * 门禁：对话框的无障碍契约（焦点 / Escape / aria 树）
 *
 * ## 为什么需要这一项
 *
 * `Modal` / `Dialog` / `Drawer` 三个弹层**各自实现了一套**焦点与键盘处理，
 * 而三套都是错的 —— 而且错法各不相同：
 *
 * | 组件 | Escape 挂在哪 | 后果 |
 * |---|---|---|
 * | `Modal` | 对话框元素的 `onKeydown` | 焦点从未移入 ⇒ 事件收不到 ⇒ **Escape 永不生效** |
 * | `Dialog` | 包裹层的 `onKeydown` | 焦点一旦离开包裹层就失效 |
 * | `Drawer` | `window.addEventListener`（**从不移除**） | 卸载后仍响应；N 个抽屉一次全关 |
 *
 * 三者共同的缺口是：打开后不把焦点移进来、关闭后不还回去、Tab 能走到背后的页面。
 * 而 `@lytjs/common-a11y` 里早就写好了 `focusTrap` —— **一次都没被调用过**。
 *
 * 这类缺陷的共同点是**视觉上完全正常**：弹窗出现了、内容正确、鼠标能点，
 * 只有键盘 / 读屏用户用不了。所以单测（断言 DOM 结构）和肉眼验收都发现不了。
 *
 * ## 2026-11-04 首次运行抓到的缺陷
 *
 * | # | 缺陷 | 实测 |
 * |---|---|---|
 * | 1 | `Modal` 的遮罩层 `aria-hidden="true"` **包着** `role="dialog"` | 整棵子树移出无障碍树，读屏**完全看不到对话框** |
 * | 2 | `Modal` 打开后焦点不进入 | `document.activeElement` 仍是触发按钮 |
 * | 3 | `Modal` / `Dialog` 的 Escape 永不生效 | 焦点不在对话框内 ⇒ 元素级监听收不到 |
 * | 4 | 关闭后焦点不回到触发元素 | `activeElement` 落在被移除的节点 / `body` |
 * | 5 | `Drawer` 的 Escape 是永不移除的 window 监听 | 卸载后仍响应；两个抽屉一次全关 |
 * | 6 | `Modal` 的 `top` 默认 `'15vh'` 被拼成 `top: 15vhpx` | 非法 CSS 整条丢弃 ⇒ 默认偏移从未生效 |
 * | 7 | `aria-label=""` / `aria-describedby=""` 铺满所有组件 | 非法的 IDREF 列表（39 个组件 × 每个实例） |
 * | 8 | `patchElement` **从不设置 `ref`** | 组件根元素「占位 div → 内容 div」走 patch ⇒ ref 回调永不触发（Dialog 的焦点管理是**死代码**） |
 * | 9 | 两个焦点陷阱会互相抢焦点 | `focusin` 互相拉回 ⇒ `RangeError: Maximum call stack size exceeded` |
 */

import { JSDOM } from '../node_modules/jsdom/lib/api.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
const w = dom.window;
for (const key of [
  'window',
  'document',
  'Node',
  'Element',
  'HTMLElement',
  'SVGElement',
  'Event',
  'MouseEvent',
  'CustomEvent',
  'KeyboardEvent',
  'Text',
  'Comment',
  'DocumentFragment',
]) {
  globalThis[key] = key === 'window' ? w : w[key];
}
try {
  Object.defineProperty(globalThis, 'navigator', { value: w.navigator, configurable: true });
} catch {
  /* Node 22 的 navigator 只有 getter */
}
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const ROOT = process.cwd();
const { createApp, h, ref } = await import(`${ROOT}/packages/core/dist/index.mjs`);
const ui = await import(`${ROOT}/packages/ecosystem/packages/ui/dist/index.mjs`);
const a11y = await import(`${ROOT}/packages/common/packages/a11y/dist/index.mjs`);

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
const sleep = (ms = 40) => new Promise((r) => setTimeout(r, ms));

/** 断言失败时也不能让门禁崩在「不是元素」上 —— 要看到是哪几条判据红了 */
const describeActive = () => {
  const el = document.activeElement;
  if (!el) return '(null)';
  return el.id || el.className || el.tagName;
};
const isInside = (container, el) => Boolean(container && el && container.contains(el));

/** 焦点已经不在任何对话框里（模拟「用户点了页面别处 / 焦点从未进入」） */
const blurAway = () => {
  const active = document.activeElement;
  if (active && typeof active.blur === 'function') active.blur();
};

const pressEscape = () => {
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
};

/**
 * 挂载一个「触发按钮 + 弹层」的小应用。
 *
 * 返回 `app` 以便**真正卸载**（直接 `host.remove()` 只是把 DOM 摘走，
 * 组件的 `onUnmounted` 不会跑 —— 那样测「卸载后是否还响应」是没有意义的）。
 */
async function mountOverlay(Component, extraProps = {}, { startOpen = false } = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const open = ref(startOpen);
  const app = createApp({
    setup: () => () =>
      h('div', [
        h('button', { id: 'trigger' }, 'open'),
        h(
          Component,
          {
            modelValue: open.value,
            title: 'T',
            'onUpdate:modelValue': (v) => {
              open.value = v;
            },
            ...extraProps,
          },
          () => h('button', { id: 'inner' }, 'ok'),
        ),
      ]),
  });
  await app.mount(host);
  await sleep();
  return { host, app, open };
}

// ══════════════════════════════════════════════════════════
section('[1] 无障碍树：role=dialog 的祖先链上不能有 aria-hidden="true"');
{
  const { app } = await mountOverlay(ui.Modal, {}, { startOpen: true });
  await sleep(60);
  const dialog = document.querySelector('.lyt-modal');
  check('Modal 渲染出 role="dialog"', dialog?.getAttribute('role') === 'dialog');
  const hiddenAncestors = [];
  for (let node = dialog?.parentElement; node; node = node.parentElement) {
    if (node.getAttribute('aria-hidden') === 'true')
      hiddenAncestors.push(node.className || node.tagName);
  }
  check(
    'Modal：没有 aria-hidden="true" 的祖先（此前遮罩层把整个对话框抹掉了）',
    hiddenAncestors.length === 0,
    hiddenAncestors,
  );
  // 对照：装饰性遮罩作为**兄弟节点**时，aria-hidden 是正确写法（Dialog 就是这样）
  const dlgOverlay = document.querySelector('.lyt-dialog__overlay');
  check(
    '对照：Dialog 的装饰性遮罩仍是 aria-hidden（兄弟节点，写法正确）',
    dlgOverlay === null || dlgOverlay.getAttribute('aria-hidden') === 'true',
    dlgOverlay?.getAttribute('aria-hidden'),
  );
  app.unmount();
  await sleep(20);
}

// ══════════════════════════════════════════════════════════
section('[2] 打开后焦点必须进入对话框');
for (const [name, Component, selector] of [
  ['Modal', ui.Modal, '.lyt-modal'],
  ['Dialog', ui.Dialog, '.lyt-dialog'],
  ['Drawer', ui.Drawer, '.lyt-drawer'],
]) {
  const { app, open } = await mountOverlay(Component);
  open.value = true;
  await sleep(80);
  const box = document.querySelector(selector);
  check(
    `${name}：焦点在对话框内（此前停在 body / 触发按钮上）`,
    isInside(box, document.activeElement),
    describeActive(),
  );
  app.unmount();
  await sleep(20);
}

// ══════════════════════════════════════════════════════════
section('[3] Escape 必须关闭（与焦点位置无关）');
for (const [name, Component, selector] of [
  ['Modal', ui.Modal, '.lyt-modal'],
  ['Dialog', ui.Dialog, '.lyt-dialog'],
  ['Drawer', ui.Drawer, '.lyt-drawer'],
]) {
  const { app, open } = await mountOverlay(Component);
  open.value = true;
  await sleep(80);
  // 关键：把焦点挪出对话框。元素级 keydown 监听在这种情况下**永远收不到事件**，
  // 而真实用户完全可能先点一下页面别处再看弹窗。
  blurAway();
  pressEscape();
  await sleep(60);
  check(`${name}：焦点在外部时 Escape 仍能关闭`, open.value === false, open.value);
  // Drawer 有 300ms 离场动画（`isClosing` 期间仍留在 DOM 里）⇒ 判据是「不再可见」，
  // 而不是「立刻消失」。Modal / Dialog 是立即移除。
  const closed = document.querySelector(selector);
  const stillVisible = Boolean(
    closed && closed.className.includes(`${name.toLowerCase()}--visible`),
  );
  check(
    `${name}：关闭后不再可见`,
    name === 'Drawer' ? !stillVisible : closed === null,
    closed ? closed.className : '(removed)',
  );
  app.unmount();
  await sleep(20);
}

// ══════════════════════════════════════════════════════════
section('[4] 关闭后焦点回到触发元素');
{
  const { app, open } = await mountOverlay(ui.Modal);
  const trigger = document.getElementById('trigger');
  trigger.focus();
  check('前置：触发器拿到焦点', document.activeElement === trigger);
  open.value = true;
  await sleep(80);
  check('打开后焦点离开触发器', document.activeElement !== trigger, describeActive());
  open.value = false;
  await sleep(80);
  check(
    '关闭后焦点回到触发器（此前落在 body / 被移除的节点）',
    document.activeElement === trigger,
    describeActive(),
  );
  app.unmount();
  await sleep(20);
}

// ══════════════════════════════════════════════════════════
section('[5] 多个弹层同时打开：Escape 只关最上层');
{
  const host = document.createElement('div');
  document.body.appendChild(host);
  const a = ref(true);
  const b = ref(true);
  const app = createApp({
    setup: () => () =>
      h('div', [
        h(
          ui.Drawer,
          { modelValue: a.value, title: 'A', 'onUpdate:modelValue': (v) => (a.value = v) },
          () => 'A',
        ),
        h(
          ui.Drawer,
          { modelValue: b.value, title: 'B', 'onUpdate:modelValue': (v) => (b.value = v) },
          () => 'B',
        ),
      ]),
  });
  await app.mount(host);
  await sleep(80);
  pressEscape();
  await sleep(60);
  check('一次 Escape 只关最上层（此前两个抽屉一起关）', a.value === true && b.value === false, {
    a: a.value,
    b: b.value,
  });
  pressEscape();
  await sleep(60);
  check('再按一次关掉剩下的那个', a.value === false, { a: a.value, b: b.value });
  app.unmount();
  await sleep(20);
}

// ══════════════════════════════════════════════════════════
section('[6] 卸载后不得再响应 Escape');
{
  const { app, open } = await mountOverlay(ui.Drawer, {}, { startOpen: true });
  await sleep(60);
  check('前置：抽屉是打开的', open.value === true);
  app.unmount();
  await sleep(40);
  pressEscape();
  await sleep(40);
  check(
    '卸载后按 Escape 不改变任何状态（此前 window 监听永不移除）',
    open.value === true,
    open.value,
  );
}

// ══════════════════════════════════════════════════════════
section('[7] Modal 的 top 偏移必须生效');
{
  const { app } = await mountOverlay(ui.Modal, {}, { startOpen: true });
  await sleep(60);
  const style = document.querySelector('.lyt-modal')?.getAttribute('style') ?? '';
  check(
    '默认 top="15vh" 生成合法 CSS（此前是 "15vhpx" 被整条丢弃）',
    /top:\s*15vh/.test(style),
    style,
  );
  app.unmount();
  await sleep(20);

  const second = await mountOverlay(ui.Modal, { top: 20 }, { startOpen: true });
  await sleep(60);
  const style2 = document.querySelector('.lyt-modal')?.getAttribute('style') ?? '';
  check('top={20} 补上 px', /top:\s*20px/.test(style2), style2);
  second.app.unmount();
  await sleep(20);
}

// ══════════════════════════════════════════════════════════
section('[8] 不得输出空串 aria-* 属性');
{
  const { app } = await mountOverlay(ui.Modal, {}, { startOpen: true });
  await sleep(60);
  const empty = [...document.querySelectorAll('*')].flatMap((el) =>
    [...el.attributes]
      .filter((attr) => attr.name.startsWith('aria-') && attr.value === '')
      .map((attr) => `${el.className || el.tagName}[${attr.name}]`),
  );
  check(
    'Modal 子树里没有 aria-*=""（此前每个实例都有 aria-label / aria-describedby 空串）',
    empty.length === 0,
    empty,
  );
  app.unmount();
  await sleep(20);

  const host = document.createElement('div');
  document.body.appendChild(host);
  const app2 = createApp({
    setup: () => () =>
      h('div', [
        h(ui.Switch, { modelValue: true }),
        h(ui.Checkbox, { modelValue: true, label: 'x' }),
        h(ui.Slider, { modelValue: 10 }),
        h(ui.Progress, { percentage: 40 }),
      ]),
  });
  await app2.mount(host);
  await sleep(60);
  const empty2 = [...host.querySelectorAll('*')].flatMap((el) =>
    [...el.attributes]
      .filter((attr) => attr.name.startsWith('aria-') && attr.value === '')
      .map((attr) => `${el.className || el.tagName}[${attr.name}]`),
  );
  check('Switch / Checkbox / Slider / Progress 也没有空串 aria 属性', empty2.length === 0, empty2);
  app2.unmount();
  await sleep(20);
}

// ══════════════════════════════════════════════════════════
section('[9] focusTrap 本身：动态列表 / 空容器 / 恢复焦点 / 嵌套不互抢');
{
  // 9.1 动态新增的可聚焦元素也要被算进陷阱
  const container = document.createElement('div');
  document.body.appendChild(container);
  const btn1 = document.createElement('button');
  btn1.textContent = '1';
  container.appendChild(btn1);
  const release = a11y.focusTrap(container);
  check('陷阱建立后初始焦点在第一个元素', document.activeElement === btn1, describeActive());

  const btn2 = document.createElement('button');
  btn2.textContent = '2';
  container.appendChild(btn2);
  btn2.focus();
  check('前置：焦点在后来新增的按钮上', document.activeElement === btn2);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
  check(
    '动态新增元素后 Tab 仍被困住（此前列表只算一次 ⇒ 焦点逃出）',
    document.activeElement === btn1,
    describeActive(),
  );
  release();
  container.remove();

  // 9.2 容器内没有任何可聚焦元素
  const emptyBox = document.createElement('div');
  emptyBox.textContent = 'loading...';
  document.body.appendChild(emptyBox);
  const release2 = a11y.focusTrap(emptyBox);
  check('空容器临时获得 tabindex=-1', emptyBox.getAttribute('tabindex') === '-1');
  check(
    '空容器自己拿到焦点（此前 focus() 是空操作，焦点停在外部）',
    document.activeElement === emptyBox,
    describeActive(),
  );
  release2();
  check('解除后 tabindex 被摘掉', emptyBox.getAttribute('tabindex') === null);
  emptyBox.remove();

  // 9.3 解除时恢复焦点
  const trigger = document.createElement('button');
  document.body.appendChild(trigger);
  trigger.focus();
  const box3 = document.createElement('div');
  const inner3 = document.createElement('button');
  box3.appendChild(inner3);
  document.body.appendChild(box3);
  const release3 = a11y.focusTrap(box3);
  check('陷阱建立后焦点进入容器', document.activeElement === inner3);
  release3();
  check('解除后焦点回到原处', document.activeElement === trigger, describeActive());
  trigger.remove();
  box3.remove();

  // 9.4 两个陷阱同时存在时不得互相抢焦点（会递归到爆栈）
  const outer = document.createElement('div');
  const outerBtn = document.createElement('button');
  outer.appendChild(outerBtn);
  document.body.appendChild(outer);
  const releaseOuter = a11y.focusTrap(outer);

  const inner = document.createElement('div');
  const innerBtn = document.createElement('button');
  inner.appendChild(innerBtn);
  document.body.appendChild(inner);

  let threw = null;
  let releaseInner = null;
  try {
    releaseInner = a11y.focusTrap(inner);
  } catch (error) {
    threw = String(error);
  }
  check(
    '嵌套陷阱不抛错（此前 RangeError: Maximum call stack size exceeded）',
    threw === null,
    threw,
  );
  check('嵌套时焦点留在最上层陷阱里', document.activeElement === innerBtn, describeActive());

  releaseInner?.();
  releaseOuter();
  outer.remove();
  inner.remove();
}

// ══════════════════════════════════════════════════════════
dom.window.close();

console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
process.exit(0);
