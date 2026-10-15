// @vitest-environment jsdom
/**
 * 行为级判据：`Dialog` 的交互与可访问性
 *
 * ## 为什么要有这条
 *
 * `Dialog`（353 行）已随包发布，覆盖率实测仅 ~9%（239 条语句未覆盖）——
 * 受控开合 / lockScroll / ESC / 遮罩点击 / 焦点陷阱 / 内置按钮六条主路径
 * 均未被真挂载验证过。
 *
 * ## 测试环境 shim
 *
 * jsdom 无布局，`offsetParent` 恒为 null ⇒ `getFocusableElements`（:124）
 * 恒返回空。焦点类用例在 beforeEach 给 `HTMLElement.prototype.offsetParent`
 * 打可恢复 stub（仅测试环境补齐布局语义，不碰产品源码）。
 *
 * ⚠️ 已登记的设计怪癖（按真实行为断言，修复走单独决策，勿顺手改）：
 *  A) 初始 `modelValue=true` 不走 watch（:71 无 immediate）⇒ `onOpen` 不调、
 *     `lockScroll` 不锁；但聚焦 effect（:155）会执行 —— 打开副作用不对称。
 *  B) 组件**从不 emit `update:modelValue`**：ESC/遮罩/× 关闭只改内部
 *     `visible` 并调 `onClose` ⇒ 关闭后外部 `modelValue` 仍为 true，
 *     想重开必须先 false 再 true（受控脱钩）。
 *  C) `header` 插槽分支不渲染关闭按钮（仅 title 分支有，:216）。
 *  D) `appendToBody` 未出现在 props 声明块（:28-50）⇒ 被 initProps 过滤、
 *     `p.appendToBody` 恒 undefined（:313）—— Teleport 分支死代码，
 *     传了静默无效（dialog 始终挂在宿主内）。
 *  E) 聚焦 effect（:155）的 setTimeout 回调从未执行（实测：打开时
 *     getFocusableElements 调用 0 次、focus() 调用 0 次，而
 *     previousActiveElement 已捕获、returnFocus 正常）⇒ 打开自动聚焦
 *     与 Tab 焦点陷阱实测均不生效；returnFocusOnClose 生效。
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { signal } from '@lytjs/reactivity';
import { Dialog } from '../src/components/Dialog';

const hosts: HTMLElement[] = [];
let offsetParentDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  // jsdom 无布局 shim：让 getFocusableElements 的 offsetParent 过滤可通过
  offsetParentDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent');
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    get(this: HTMLElement) {
      return this === document.body ? null : document.body;
    },
    configurable: true,
  });
});

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
  if (offsetParentDescriptor) {
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', offsetParentDescriptor);
  }
  document.body.style.overflow = '';
});

const tick = (n = 20): Promise<void> => new Promise((r) => setTimeout(r, n));

/** 受控挂载：signal 驱动 modelValue */
async function mountDialog(
  props: Record<string, unknown> = {},
  slots?: Record<string, (...args: never[]) => unknown>,
): Promise<{ host: HTMLElement; mv: ReturnType<typeof signal<boolean>> }> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  const mv = signal<boolean>(Boolean(props.modelValue ?? false));
  await createApp({
    setup() {
      return () => h(Dialog as never, { ...props, modelValue: mv() }, slots as never);
    },
  } as never).mount(host);
  await tick(30);
  return { host, mv };
}

const q = (host: HTMLElement | Document, sel: string): HTMLElement | null =>
  host.querySelector(sel) as HTMLElement | null;
const pressKey = (target: HTMLElement, key: string, shiftKey = false): void => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true }));
};

describe('Dialog — 渲染与 a11y', () => {
  it('modelValue=false：只渲染 display:none 占位，无 dialog', async () => {
    const { host } = await mountDialog({ title: '标题' });
    expect(q(host, '.lyt-dialog')).toBeNull();
    const placeholder = host.firstElementChild as HTMLElement;
    expect(placeholder.style.display).toBe('none');
  });

  it('打开：role=dialog / aria-modal / title / 默认 width 50%', async () => {
    const { host, mv } = await mountDialog({ title: '设置' });
    mv.set(true);
    await tick(30);
    const dialog = q(host, '.lyt-dialog')!;
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.style.width).toBe('50%');
    expect(q(host, '.lyt-dialog__title')!.textContent).toBe('设置');
  });

  it('width：数字转 px，字符串原样', async () => {
    const { host, mv } = await mountDialog({ title: 't', width: 400 });
    mv.set(true);
    await tick(30);
    expect(q(host, '.lyt-dialog')!.style.width).toBe('400px');
  });

  it('id 透传：aria-labelledby=「id-title」、body id、aria-describedby 默认「id-body」', async () => {
    const { host, mv } = await mountDialog({ id: 'dlg', title: '标题' }, {
      default: () => [h('p', {}, '正文')],
    } as never);
    mv.set(true);
    await tick(30);
    const dialog = q(host, '.lyt-dialog')!;
    expect(dialog.getAttribute('aria-labelledby')).toBe('dlg-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('dlg-body');
    expect(q(host, '.lyt-dialog__title')!.id).toBe('dlg-title');
    expect(q(host, '.lyt-dialog__body')!.id).toBe('dlg-body');
  });

  it('ariaLabel 优先于 title 作 aria-label；ariaDescribedBy 覆盖默认', async () => {
    const { host, mv } = await mountDialog({
      id: 'd2',
      title: '标题',
      ariaLabel: '自定义标签',
      ariaDescribedBy: 'ext-desc',
    });
    mv.set(true);
    await tick(30);
    const dialog = q(host, '.lyt-dialog')!;
    expect(dialog.getAttribute('aria-label')).toBe('自定义标签');
    expect(dialog.getAttribute('aria-describedby')).toBe('ext-desc');
  });

  it('class 透传到 .lyt-dialog；ariaModal=false 落到 aria-modal', async () => {
    const { host, mv } = await mountDialog({ title: 't', class: 'my-dlg', ariaModal: false });
    mv.set(true);
    await tick(30);
    const dialog = q(host, '.lyt-dialog')!;
    expect(dialog.className).toContain('my-dlg');
    expect(dialog.getAttribute('aria-modal')).toBe('false');
  });

  it('default 插槽渲染进 body；header 插槽优先于 title 且无关闭按钮（怪癖 C）', async () => {
    const { host, mv } = await mountDialog({ title: '会被覆盖' }, {
      header: () => [h('b', { class: 'my-header' }, '自定义头')],
      default: () => [h('p', { class: 'my-body' }, '内容')],
    } as never);
    mv.set(true);
    await tick(30);
    expect(q(host, '.my-header')!.textContent).toBe('自定义头');
    expect(q(host, '.lyt-dialog__title')).toBeNull();
    expect(q(host, '.lyt-dialog__close')).toBeNull(); // 插槽头没有 ×
    expect(q(host, '.my-body')!.textContent).toBe('内容');
  });

  it('showClose=false 不渲染 ×；默认渲染带 aria-label 的 ×', async () => {
    const { host, mv } = await mountDialog({ title: 't' });
    mv.set(true);
    await tick(30);
    expect(q(host, '.lyt-dialog__close')!.getAttribute('aria-label')).toBe('Close dialog');
  });

  it('showClose=false：无 ×', async () => {
    const { host, mv } = await mountDialog({ title: 't', showClose: false });
    mv.set(true);
    await tick(30);
    expect(q(host, '.lyt-dialog__close')).toBeNull();
  });

  it('footer 插槽渲染；无插槽且无内置回调时不渲染 footer', async () => {
    const { host, mv } = await mountDialog({ title: 't' }, {
      footer: () => [h('i', { class: 'my-footer' }, '脚')],
    } as never);
    mv.set(true);
    await tick(30);
    expect(q(host, '.my-footer')!.textContent).toBe('脚');

    const r2 = await mountDialog({ title: 't' });
    r2.mv.set(true);
    await tick(30);
    expect(q(r2.host, '.lyt-dialog__footer')).toBeNull();
  });

  it('appendToBody：未声明被过滤，dialog 仍挂宿主内（怪癖 D：传了静默无效）', async () => {
    const { host, mv } = await mountDialog({ title: 'tele', appendToBody: true });
    mv.set(true);
    await tick(30);
    // 真实行为：p.appendToBody 恒 undefined ⇒ withTeleport 原样返回 ⇒ 不 teleport
    expect(q(host, '.lyt-dialog')).toBeTruthy();
    expect(q(host, '.lyt-dialog__wrapper')!.parentElement).not.toBe(document.body);
  });
});

describe('Dialog — 打开与关闭', () => {
  it('modelValue false→true：onOpen 调用、body overflow 锁定（lockScroll 默认）', async () => {
    const onOpen = vi.fn();
    const { host, mv } = await mountDialog({ title: 't', onOpen });
    expect(document.body.style.overflow).toBe('');
    mv.set(true);
    await tick(30);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(document.body.style.overflow).toBe('hidden');
    expect(q(host, '.lyt-dialog')).toBeTruthy();
  });

  it('初始 modelValue=true：渲染但 onOpen 不调、overflow 不锁（怪癖 A：watch 无 immediate）', async () => {
    const onOpen = vi.fn();
    const { host } = await mountDialog({ title: 't', modelValue: true, onOpen });
    await tick(30);
    expect(q(host, '.lyt-dialog')).toBeTruthy(); // 渲染了
    expect(onOpen).not.toHaveBeenCalled(); // 但打开回调没走
    expect(document.body.style.overflow).toBe(''); // 也没锁滚动
  });

  it('× 点击：onClose 调用、overflow 恢复、dialog 消失', async () => {
    const onClose = vi.fn();
    const { host, mv } = await mountDialog({ title: 't', onClose });
    mv.set(true);
    await tick(30);
    q(host, '.lyt-dialog__close')!.click();
    await tick(30);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.body.style.overflow).toBe('');
    expect(q(host, '.lyt-dialog')).toBeNull();
  });

  it('onBeforeClose 返回 false 阻止关闭', async () => {
    const onClose = vi.fn();
    const onBeforeClose = vi.fn(() => false);
    const { host, mv } = await mountDialog({ title: 't', onClose, onBeforeClose });
    mv.set(true);
    await tick(30);
    q(host, '.lyt-dialog__close')!.click();
    await tick(30);
    expect(onBeforeClose).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(q(host, '.lyt-dialog')).toBeTruthy(); // 仍开着
  });

  it('onBeforeOpen 返回 false 阻止打开；异步放行后打开', async () => {
    const onBeforeOpen = vi.fn(() => false);
    const { host, mv } = await mountDialog({ title: 't', onBeforeOpen });
    mv.set(true);
    await tick(30);
    expect(q(host, '.lyt-dialog')).toBeNull();

    const slow = vi.fn(async () => {
      await tick(5);
      return true;
    });
    const r2 = await mountDialog({ title: 't', onBeforeOpen: slow });
    r2.mv.set(true);
    await tick(50);
    expect(slow).toHaveBeenCalledTimes(1);
    expect(q(r2.host, '.lyt-dialog')).toBeTruthy();
  });

  it('遮罩点击关闭（closeOnClickModal 默认）', async () => {
    const onClose = vi.fn();
    const { host, mv } = await mountDialog({ title: 't', onClose });
    mv.set(true);
    await tick(30);
    q(host, '.lyt-dialog__overlay')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick(30);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(q(host, '.lyt-dialog')).toBeNull();
  });

  it('closeOnClickModal=false：遮罩点击不关闭', async () => {
    const onClose = vi.fn();
    const { host, mv } = await mountDialog({ title: 't', onClose, closeOnClickModal: false });
    mv.set(true);
    await tick(30);
    q(host, '.lyt-dialog__overlay')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick(30);
    expect(onClose).not.toHaveBeenCalled();
    expect(q(host, '.lyt-dialog')).toBeTruthy();
  });

  it('ESC 关闭（closeOnPressEscape 默认）+ onKeydown 透传任意键', async () => {
    const onClose = vi.fn();
    const onKeydown = vi.fn();
    const { host, mv } = await mountDialog({ title: 't', onClose, onKeydown });
    mv.set(true);
    await tick(30);
    pressKey(q(host, '.lyt-dialog')!, 'Enter');
    expect(onKeydown).toHaveBeenCalledTimes(1);
    expect(q(host, '.lyt-dialog')).toBeTruthy(); // Enter 不关
    pressKey(q(host, '.lyt-dialog')!, 'Escape');
    await tick(30);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(q(host, '.lyt-dialog')).toBeNull();
  });

  it('closeOnPressEscape=false：ESC 不关闭但 onKeydown 仍透传', async () => {
    const onClose = vi.fn();
    const onKeydown = vi.fn();
    const { host, mv } = await mountDialog({
      title: 't',
      onClose,
      onKeydown,
      closeOnPressEscape: false,
    });
    mv.set(true);
    await tick(30);
    pressKey(q(host, '.lyt-dialog')!, 'Escape');
    await tick(30);
    expect(onKeydown).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(q(host, '.lyt-dialog')).toBeTruthy();
  });

  it('lockScroll=false：打开不锁 overflow', async () => {
    const { mv } = await mountDialog({ title: 't', lockScroll: false });
    mv.set(true);
    await tick(30);
    expect(document.body.style.overflow).toBe('');
  });

  it('无 update:modelValue emit：× 关闭后 modelValue 仍为 true，重开需先 false（怪癖 B）', async () => {
    const { host, mv } = await mountDialog({ title: 't' });
    mv.set(true);
    await tick(30);
    q(host, '.lyt-dialog__close')!.click();
    await tick(30);
    expect(q(host, '.lyt-dialog')).toBeNull();
    // 外部 modelValue 仍是 true：再 set(true) 无变化 ⇒ watch 不触发 ⇒ 不会重开
    mv.set(true);
    await tick(30);
    expect(q(host, '.lyt-dialog')).toBeNull();
    // 先 false 再 true 才重开
    mv.set(false);
    await tick(20);
    mv.set(true);
    await tick(30);
    expect(q(host, '.lyt-dialog')).toBeTruthy();
  });

  it('modelValue true→false（外部主动关）：dialog 消失、overflow 恢复、onClose 不调', async () => {
    const onClose = vi.fn();
    const { host, mv } = await mountDialog({ title: 't', onClose });
    mv.set(true);
    await tick(30);
    expect(document.body.style.overflow).toBe('hidden');
    mv.set(false);
    await tick(30);
    expect(q(host, '.lyt-dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(onClose).not.toHaveBeenCalled(); // 外部关闭不走 onClose
  });
});

describe('Dialog — 内置 footer 按钮', () => {
  it('传 onConfirm/onCancel 渲染取消/确定按钮，点击调用并关闭', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const onClose = vi.fn();
    const { host, mv } = await mountDialog({ title: 't', onConfirm, onCancel, onClose });
    mv.set(true);
    await tick(30);
    expect(q(host, '.lyt-dialog__cancel-btn')!.textContent).toBe('取消');
    expect(q(host, '.lyt-dialog__confirm-btn')!.textContent).toBe('确定');

    q(host, '.lyt-dialog__confirm-btn')!.click();
    await tick(30);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(q(host, '.lyt-dialog')).toBeNull();
  });

  it('取消按钮：onCancel 调用并关闭；只传一个回调只渲染一个按钮', async () => {
    const onCancel = vi.fn();
    const { host, mv } = await mountDialog({ title: 't', onCancel });
    mv.set(true);
    await tick(30);
    expect(q(host, '.lyt-dialog__confirm-btn')).toBeNull();
    q(host, '.lyt-dialog__cancel-btn')!.click();
    await tick(30);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(q(host, '.lyt-dialog')).toBeNull();
  });

  it('footer 插槽与内置按钮共存', async () => {
    const onConfirm = vi.fn();
    const { host, mv } = await mountDialog({ title: 't', onConfirm }, {
      footer: () => [h('i', { class: 'slot-foot' }, '插槽脚')],
    } as never);
    mv.set(true);
    await tick(30);
    const footer = q(host, '.lyt-dialog__footer')!;
    expect(footer.textContent).toContain('插槽脚');
    expect(footer.textContent).toContain('确定');
  });
});

describe('Dialog — 焦点管理（jsdom offsetParent shim；怪癖 E 实测）', () => {
  it('打开后焦点不自动移动（怪癖 E）；但 previousActiveElement 已捕获，关闭归还焦点', async () => {
    const outer = document.createElement('button');
    outer.textContent = '外部按钮';
    document.body.appendChild(outer);
    hosts.push(outer as unknown as HTMLElement);
    outer.focus();

    const { host, mv } = await mountDialog({ title: 't' });
    mv.set(true);
    await tick(50);
    // 怪癖 E：自动聚焦的 setTimeout 回调从未执行 ⇒ 焦点原地不动
    expect(document.activeElement).toBe(outer);

    // 手动聚焦进弹窗，关闭后归还到 outer（returnFocusOnClose 默认 true）
    const closeBtn = q(host, '.lyt-dialog__close')!;
    closeBtn.focus();
    expect(document.activeElement).toBe(closeBtn);
    closeBtn.click();
    await tick(30);
    expect(document.activeElement).toBe(outer);
  });

  it('returnFocusOnClose=false：关闭不归还焦点', async () => {
    const outer = document.createElement('button');
    document.body.appendChild(outer);
    hosts.push(outer as unknown as HTMLElement);
    outer.focus();

    const { host, mv } = await mountDialog({ title: 't', returnFocusOnClose: false });
    mv.set(true);
    await tick(50);
    const closeBtn = q(host, '.lyt-dialog__close')!;
    closeBtn.focus();
    closeBtn.click();
    await tick(30);
    expect(document.activeElement).not.toBe(outer); // 不归还（焦点随 DOM 移除落到 body）
  });

  it('initialFocus 同样不生效（怪癖 E：同一断点）', async () => {
    const { host, mv } = await mountDialog({ title: 't', initialFocus: '.target-btn' }, {
      default: () => [
        h('button', { class: 'other-btn' }, '其他'),
        h('button', { class: 'target-btn' }, '目标'),
      ],
    } as never);
    mv.set(true);
    await tick(50);
    expect(document.activeElement).not.toBe(q(host, '.target-btn'));
  });

  it('Tab 键循环不生效（怪癖 E）：焦点不被拦截', async () => {
    const onConfirm = vi.fn();
    const { host, mv } = await mountDialog({ title: 't', onConfirm });
    mv.set(true);
    await tick(50);
    const confirmBtn = q(host, '.lyt-dialog__confirm-btn')!;
    confirmBtn.focus();
    pressKey(confirmBtn, 'Tab');
    // 真实行为：handleTabKey 取不到 dialogRef ⇒ 不 preventDefault 也不移焦
    expect(document.activeElement).toBe(confirmBtn);
  });
});
