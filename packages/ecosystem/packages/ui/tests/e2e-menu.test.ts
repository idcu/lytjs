// @vitest-environment jsdom
/**
 * 行为级判据：`Menu` 的导航、子菜单与可访问性
 *
 * ## 为什么要有这条
 *
 * `Menu`（461 行）是 UI 包里**已从 `src/index.ts` 导出、随包发布**的公开组件，
 * 但覆盖率实测仅 ~5%（337 条语句未覆盖）—— 选择 / 子菜单开合 / 键盘导航 / a11y
 * 四条主路径一条都没被验证过。
 *
 * ⇒ 用 `createApp` 真挂载 + 真实事件派发断言（与 `e2e-steps` / `e2e-select` / `e2e-slider` 同范式）。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { Menu } from '../src/components/Menu';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

/** 叶子项 / 父项（带 children）/ 禁用项 —— 组件从 VNode 的 props 读 index/label/children/disabled */
const ITEMS = () => [
  h('div', { index: 'home', label: '首页' }),
  h('div', {
    index: 'products',
    label: '产品',
    children: [
      { index: 'p1', label: '产品一' },
      { index: 'p2', label: '产品二' },
      { index: 'p3', label: '已下线', disabled: true },
    ],
  }),
  h('div', { index: 'about', label: '关于', disabled: true }),
];

async function mountMenu(
  props: Record<string, unknown> = {},
  items: unknown[] = ITEMS(),
): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  await createApp({
    setup() {
      return () => h(Menu as never, props, { default: () => items });
    },
  } as never).mount(host);
  await new Promise((r) => setTimeout(r, 30));
  return host;
}

const q = (host: HTMLElement, sel: string): HTMLElement | null =>
  host.querySelector(sel) as HTMLElement | null;
const qa = (host: HTMLElement, sel: string): HTMLElement[] =>
  [...host.querySelectorAll(sel)] as HTMLElement[];
const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 20));
/** 顶层菜单项（排除子菜单里的） */
const topItems = (host: HTMLElement): HTMLElement[] => qa(host, '.lyt-menu > .lyt-menu__item');
const sro = (host: HTMLElement): string => q(host, '.lyt-menu__sro')?.textContent ?? '';

describe('Menu — 渲染与 a11y 语义', () => {
  it('渲染 ul[role=menubar] 与 li[role=menuitem]，默认 aria-label', async () => {
    const host = await mountMenu();
    const bar = q(host, 'ul.lyt-menu')!;
    expect(bar.getAttribute('role')).toBe('menubar');
    expect(bar.getAttribute('aria-label')).toBe('主菜单');
    expect(topItems(host)).toHaveLength(3);
    expect(topItems(host)[0]!.getAttribute('role')).toBe('menuitem');
    expect(host.textContent).toContain('首页');
  });

  it('mode / class / id / ariaLabel / ariaDescribedBy 落到根 ul', async () => {
    const host = await mountMenu({
      mode: 'vertical',
      class: 'my-menu',
      id: 'nav',
      ariaLabel: '主导航',
      ariaDescribedBy: 'nav-desc',
    });
    const bar = q(host, 'ul.lyt-menu')!;
    expect(bar.className).toContain('lyt-menu--vertical');
    expect(bar.className).toContain('my-menu');
    expect(bar.getAttribute('id')).toBe('nav');
    expect(bar.getAttribute('aria-label')).toBe('主导航');
    expect(bar.getAttribute('aria-describedby')).toBe('nav-desc');
  });

  it('带 children 的项才有 aria-expanded；叶子项 aria-haspopup 为 "false"', async () => {
    const host = await mountMenu();
    const [leaf, parent] = topItems(host);
    // 注：`aria-haspopup` 在合并对象里传的是**布尔** `hasChildren` ⇒ 叶子项为 `false`；
    // 经 2026-10-13 的 `patchAttr` 修复后 `false` 渲染成 `"false"`（而非被移除）。
    // 这符合 ARIA（haspopup 默认即 false），只是比"省略"更显式。
    expect(leaf!.getAttribute('aria-haspopup')).toBe('false');
    expect(leaf!.getAttribute('aria-expanded')).toBeNull();
    expect(parent!.getAttribute('aria-haspopup')).toBe('true');
    expect(parent!.getAttribute('aria-expanded')).toBe('false');
  });

  it('禁用项带 --disabled 与 aria-disabled；未禁用项无 aria-disabled', async () => {
    const host = await mountMenu();
    const items = topItems(host);
    expect(items[0]!.className).not.toContain('--disabled');
    expect(items[0]!.getAttribute('aria-disabled')).toBeNull();
    expect(items[2]!.className).toContain('lyt-menu__item--disabled');
    expect(items[2]!.getAttribute('aria-disabled')).toBe('true');
  });

  it('无 index 的子节点原样返回（不被包装成 menuitem）', async () => {
    const host = await mountMenu({}, [h('div', { class: 'raw-node' }, '原样')]);
    expect(q(host, '.raw-node')).toBeTruthy();
    expect(qa(host, '[role="menuitem"]')).toHaveLength(0);
  });
});

describe('Menu — 选择', () => {
  it('点击叶子项触发 onSelect 并标记 active，且写入 live region', async () => {
    const seen: unknown[] = [];
    const host = await mountMenu({ onSelect: (i: string) => seen.push(i) });
    topItems(host)[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    expect(seen).toEqual(['home']);
    expect(topItems(host)[0]!.className).toContain('lyt-menu__item--active');
    expect(sro(host)).toContain('已选择菜单项：home');
  });

  it('点击禁用项不触发 onSelect', async () => {
    const seen: unknown[] = [];
    const host = await mountMenu({ onSelect: (i: string) => seen.push(i) });
    topItems(host)[2]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    expect(seen).toEqual([]);
  });
});

describe('Menu — 子菜单', () => {
  it('点击父项展开：aria-expanded=true、submenu--opened、onOpen', async () => {
    const opened: unknown[] = [];
    const host = await mountMenu({ onOpen: (i: string) => opened.push(i) });
    topItems(host)[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    expect(opened).toEqual(['products']);
    expect(topItems(host)[1]!.getAttribute('aria-expanded')).toBe('true');
    expect(q(host, '.lyt-menu__submenu')!.className).toContain('lyt-menu__submenu--opened');
    expect(qa(host, '.lyt-menu__submenu-item')).toHaveLength(3);
    expect(sro(host)).toContain('已打开子菜单：产品');
  });

  it('再次点击父项收起并触发 onClose', async () => {
    const closed: unknown[] = [];
    const host = await mountMenu({ onClose: (i: string) => closed.push(i) });
    topItems(host)[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    topItems(host)[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    expect(closed).toEqual(['products']);
    expect(topItems(host)[1]!.getAttribute('aria-expanded')).toBe('false');
    expect(q(host, '.lyt-menu__submenu')!.className).not.toContain('--opened');
  });

  it('uniqueOpened：打开一个会关掉先前打开的', async () => {
    const items = [
      h('div', { index: 'a', label: 'A', children: [{ index: 'a1', label: 'A1' }] }),
      h('div', { index: 'b', label: 'B', children: [{ index: 'b1', label: 'B1' }] }),
    ];
    const host = await mountMenu({ uniqueOpened: true }, items);
    topItems(host)[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    topItems(host)[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    const subs = qa(host, '.lyt-menu__submenu');
    expect(subs[0]!.className).not.toContain('--opened');
    expect(subs[1]!.className).toContain('--opened');
    expect(sro(host)).toContain('已关闭其他子菜单');
  });

  it('子项点击触发 onSelect；禁用子项不触发', async () => {
    const seen: unknown[] = [];
    const host = await mountMenu({ onSelect: (i: string) => seen.push(i) });
    topItems(host)[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    const children = qa(host, '.lyt-menu__submenu-item');
    children[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    children[2]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    expect(seen).toEqual(['p1']);
  });
});

describe('Menu — 键盘', () => {
  const key = (el: HTMLElement, k: string): void => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  };

  it('ArrowDown 在已关闭的父项上展开子菜单', async () => {
    const host = await mountMenu();
    key(topItems(host)[1]!, 'ArrowDown');
    await tick();
    expect(topItems(host)[1]!.getAttribute('aria-expanded')).toBe('true');
  });

  it('ArrowDown 在叶子上把焦点移到下一个可用项', async () => {
    const host = await mountMenu();
    key(topItems(host)[0]!, 'ArrowDown');
    await tick();
    // home(0) → products(1) 可用 ⇒ focused
    const items = topItems(host);
    expect(items[1]!.className).toContain('lyt-menu__item--focused');
    expect(items[1]!.getAttribute('tabindex')).toBe('0');
    expect(items[0]!.getAttribute('tabindex')).toBe('-1');
    expect(sro(host)).toContain('导航到菜单项：产品');
  });

  it('ArrowUp 回到上一个可用项', async () => {
    const host = await mountMenu();
    key(topItems(host)[1]!, 'ArrowUp');
    await tick();
    expect(topItems(host)[0]!.className).toContain('lyt-menu__item--focused');
  });

  it('Enter 在叶子上选择，在父项上切换子菜单', async () => {
    const seen: unknown[] = [];
    const host = await mountMenu({ onSelect: (i: string) => seen.push(i) });
    key(topItems(host)[0]!, 'Enter');
    await tick();
    expect(seen).toEqual(['home']);
    key(topItems(host)[1]!, 'Enter');
    await tick();
    expect(topItems(host)[1]!.getAttribute('aria-expanded')).toBe('true');
  });

  it('Escape 关闭已展开的子菜单', async () => {
    const host = await mountMenu();
    topItems(host)[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    key(topItems(host)[1]!, 'Escape');
    await tick();
    expect(topItems(host)[1]!.getAttribute('aria-expanded')).toBe('false');
  });

  it('Home / End 跳到首个 / 末个可用项（跳过禁用）', async () => {
    const host = await mountMenu();
    key(topItems(host)[1]!, 'Home');
    await tick();
    expect(topItems(host)[0]!.className).toContain('lyt-menu__item--focused');
    key(topItems(host)[0]!, 'End');
    await tick();
    // about(2) 是禁用项 ⇒ 末个可用是 products(1)
    expect(topItems(host)[1]!.className).toContain('lyt-menu__item--focused');
  });
});
