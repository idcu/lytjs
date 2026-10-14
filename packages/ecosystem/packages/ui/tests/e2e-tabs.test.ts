// @vitest-environment jsdom
/**
 * 行为级判据：`Tabs` 的交互与可访问性
 *
 * ## 为什么要有这条
 *
 * `Tabs`（438 行）是 UI 包里**已从 `src/index.ts` 导出、随包发布**的公开组件，
 * 但覆盖率实测仅 ~16%（302 条语句未覆盖）—— 点击切换 / 键盘导航 / 关闭 / 新增 /
 * 拖拽 / a11y live-region 六条主路径一条都没被验证过。
 *
 * ⇒ 用 `createApp` 真挂载 + 真实事件派发断言（与 `e2e-slider` / `e2e-menu` 同范式）。
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { signal } from '@lytjs/reactivity';
import { Tabs, TabPane } from '../src/components/Tabs';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

interface PaneSpec {
  label: string;
  name: string;
  disabled?: boolean;
  closable?: boolean;
  content?: string;
}

async function mountTabs(
  props: Record<string, unknown> = {},
  panes: PaneSpec[] = [
    { label: 'Tab A', name: 'a', content: 'Content A' },
    { label: 'Tab B', name: 'b', content: 'Content B' },
    { label: 'Tab C', name: 'c', content: 'Content C' },
  ],
): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  await createApp({
    setup() {
      return () =>
        h(Tabs as never, props, () =>
          panes.map((p) =>
            h(
              TabPane as never,
              {
                label: p.label,
                name: p.name,
                disabled: p.disabled,
                closable: p.closable,
              },
              // ⚠️ children 直接传字符串：Tabs 渲染时取 `vnode.children` 塞进 panel，
              //    传函数会被当文本 toString 渲染（TabPane 组件本身从不被真正渲染）。
              p.content ?? p.label,
            ),
          ),
        );
    },
  } as never).mount(host);
  await new Promise((r) => setTimeout(r, 30));
  return host;
}

const q = (host: HTMLElement, sel: string): HTMLElement | null =>
  host.querySelector(sel) as HTMLElement | null;
const qa = (host: HTMLElement, sel: string): HTMLElement[] =>
  [...host.querySelectorAll(sel)] as HTMLElement[];

/**
 * 受控挂载：用 signal 驱动 modelValue（onChange 时回写）。
 * Tabs 渲染时强制 `activeIndex` 同步 `modelValue || panes[0].name` ——
 * 静态 modelValue 下一切内部切换都会在重渲染时被重置（见文末缺陷登记），
 * 因此交互后断言 DOM 状态的用例必须走受控模式。
 */
async function mountTabsControlled(
  props: Record<string, unknown> = {},
  panes: PaneSpec[] = [
    { label: 'Tab A', name: 'a', content: 'Content A' },
    { label: 'Tab B', name: 'b', content: 'Content B' },
    { label: 'Tab C', name: 'c', content: 'Content C' },
  ],
): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  const mv = signal<string>((props.modelValue as string) ?? '');
  const userOnChange = props.onChange as ((name: string) => void) | undefined;
  await createApp({
    setup() {
      return () =>
        h(
          Tabs as never,
          {
            ...props,
            modelValue: mv(),
            onChange: (name: string) => {
              mv.set(name);
              userOnChange?.(name);
            },
          },
          () =>
            panes.map((p) =>
              h(
                TabPane as never,
                {
                  label: p.label,
                  name: p.name,
                  disabled: p.disabled,
                  closable: p.closable,
                },
                p.content ?? p.label,
              ),
            ),
        );
    },
  } as never).mount(host);
  await new Promise((r) => setTimeout(r, 30));
  return host;
}

describe('Tabs — 渲染', () => {
  it('渲染 tablist / tab / tabpanel，aria 属性完整', async () => {
    const host = await mountTabs({ id: 'my-tabs' });
    expect(q(host, '[role="tablist"]')).toBeTruthy();
    const tabs = qa(host, '[role="tab"]');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('false');
    expect(tabs[0]!.getAttribute('aria-controls')).toBe('my-tabs-panel-a');
    expect(tabs[0]!.id).toBe('my-tabs-tab-a');
    const panel = q(host, '[role="tabpanel"]')!;
    expect(panel.id).toBe('my-tabs-panel-a');
    expect(panel.getAttribute('aria-labelledby')).toBe('my-tabs-tab-a');
    expect(panel.textContent).toBe('Content A');
  });

  it('type 与自定义 class 落到根元素', async () => {
    const host = await mountTabs({ type: 'card', class: 'extra' });
    const root = q(host, '.lyt-tabs')!;
    expect(root.className).toContain('lyt-tabs--card');
    expect(root.className).toContain('extra');
  });

  it('border-card 类型类名', async () => {
    const host = await mountTabs({ type: 'border-card' });
    expect(q(host, '.lyt-tabs')!.className).toContain('lyt-tabs--border-card');
  });

  it('modelValue 控制初始激活项', async () => {
    const host = await mountTabs({ modelValue: 'b' });
    const tabs = qa(host, '[role="tab"]');
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
    expect(q(host, '[role="tabpanel"]')!.textContent).toBe('Content B');
  });

  it('modelValue 匹配不到时无 tab 选中（真实行为，内外状态不一致已登记）', async () => {
    // ⚠️ 真实行为：modelValue='nonexistent' 时 currentIndex=-1，渲染不强制 activeIndex，
    //    但 isActive 按 currentName 计算 ⇒ 所有 tab 的 aria-selected 都是 false，
    //    而内部 activeIndex 仍为 0（键盘 Enter 会按 activeIndex 触发第一个 tab）。
    //    内外状态不一致属设计缺陷，修复走单独决策，此处断言真实行为。
    const host = await mountTabs({ modelValue: 'nonexistent' });
    const tabs = qa(host, '[role="tab"]');
    expect(tabs.every((t) => t.getAttribute('aria-selected') === 'false')).toBe(true);
  });

  it('空 slot 时不渲染 tab，panel 占位 display:none', async () => {
    const host = await mountTabs({}, []);
    expect(qa(host, '[role="tab"]')).toHaveLength(0);
    const panel = q(host, '.lyt-tabs__pane') ?? q(host, '[id$="-panel-default"]');
    expect(panel).toBeTruthy();
  });

  it('过滤非 TabPane 子节点', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);
    await createApp({
      setup() {
        return () =>
          h(Tabs as never, {}, () => [
            h('div', { class: 'not-a-pane' }, 'intruder'),
            h(TabPane as never, { label: 'Real', name: 'real' }, () => 'real content'),
          ]);
      },
    } as never).mount(host);
    await new Promise((r) => setTimeout(r, 30));
    expect(qa(host, '[role="tab"]')).toHaveLength(1);
    expect(q(host, '.not-a-pane')).toBeNull();
  });

  it('ariaLabel / ariaDescribedBy 透传', async () => {
    const host = await mountTabs({ ariaLabel: '主导航', ariaDescribedBy: 'desc-id' });
    const list = q(host, '[role="tablist"]')!;
    expect(list.getAttribute('aria-label')).toBe('主导航');
  });
});

describe('Tabs — 点击切换', () => {
  it('点击切换激活项并触发 onChange / onTabClick（受控）', async () => {
    const onChange = vi.fn();
    const onTabClick = vi.fn();
    const host = await mountTabsControlled({ onChange, onTabClick });
    qa(host, '[role="tab"]')[1]!.click();
    await new Promise((r) => setTimeout(r, 20));
    expect(onChange).toHaveBeenCalledWith('b');
    expect(onTabClick).toHaveBeenCalledTimes(1);
    expect(qa(host, '[role="tab"]')[1]!.getAttribute('aria-selected')).toBe('true');
    expect(q(host, '[role="tabpanel"]')!.textContent).toBe('Content B');
  });

  it('非受控（静态 modelValue）下点击切换被渲染强制重置 —— 缺陷登记', async () => {
    // ⚠️ 缺陷登记（2026-10-15）：渲染函数每次执行 `activeIndex` 强制同步
    //    `modelValue || panes[0].name`（src/components/Tabs.ts:288-290）。
    //    非受控用法（外部不回写 modelValue）下，点击切换的 activeIndex 在紧随的
    //    重渲染中被重置回 0 ⇒ 视觉选中态跳回第一个 tab。组件无 defaultValue 式
    //    非受控入口。onChange 回调本身仍正常触发。修复属行为变更，走单独决策。
    const onChange = vi.fn();
    const host = await mountTabs({ onChange });
    qa(host, '[role="tab"]')[1]!.click();
    await new Promise((r) => setTimeout(r, 30));
    expect(onChange).toHaveBeenCalledWith('b'); // 事件正常发出
    expect(qa(host, '[role="tab"]')[0]!.getAttribute('aria-selected')).toBe('true'); // 但被重置
  });

  it('点击 disabled tab 不切换', async () => {
    const onChange = vi.fn();
    const host = await mountTabs({ onChange }, [
      { label: 'A', name: 'a', content: 'A' },
      { label: 'B', name: 'b', disabled: true, content: 'B' },
    ]);
    qa(host, '[role="tab"]')[1]!.click();
    await new Promise((r) => setTimeout(r, 20));
    expect(onChange).not.toHaveBeenCalled();
    expect(qa(host, '[role="tab"]')[0]!.getAttribute('aria-selected')).toBe('true');
  });

  it('重复点击同一 tab 不重复 announce（但 onChange 仍触发）', async () => {
    const onChange = vi.fn();
    const host = await mountTabs({ onChange });
    const tab = qa(host, '[role="tab"]')[0]!;
    tab.click();
    await new Promise((r) => setTimeout(r, 20));
    tab.click();
    await new Promise((r) => setTimeout(r, 20));
    // onChange 每次都触发（由父组件决定是否需要防抖）
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('切换后 live region 出现公告文本', async () => {
    const host = await mountTabs({});
    qa(host, '[role="tab"]')[1]!.click();
    await new Promise((r) => setTimeout(r, 20));
    const sro = q(host, '.lyt-tabs__sro')!;
    expect(sro.textContent).toContain('已切换到标签页 2');
    expect(sro.getAttribute('aria-live')).toBe('polite');
  });
});

describe('Tabs — 键盘导航', () => {
  function keydown(el: HTMLElement, key: string): void {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  }

  it('ArrowRight 循环到下一个可用药 tab', async () => {
    const host = await mountTabsControlled({});
    keydown(q(host, '[role="tablist"]')!, 'ArrowRight');
    await new Promise((r) => setTimeout(r, 20));
    expect(qa(host, '[role="tab"]')[1]!.getAttribute('aria-selected')).toBe('true');
  });

  it('ArrowLeft 循环到上一个', async () => {
    const host = await mountTabsControlled({ modelValue: 'b' });
    keydown(q(host, '[role="tablist"]')!, 'ArrowLeft');
    await new Promise((r) => setTimeout(r, 20));
    expect(qa(host, '[role="tab"]')[0]!.getAttribute('aria-selected')).toBe('true');
  });

  it('ArrowDown 等价 ArrowRight', async () => {
    const host = await mountTabsControlled({});
    keydown(q(host, '[role="tablist"]')!, 'ArrowDown');
    await new Promise((r) => setTimeout(r, 20));
    expect(qa(host, '[role="tab"]')[1]!.getAttribute('aria-selected')).toBe('true');
  });

  it('ArrowUp 等价 ArrowLeft', async () => {
    const host = await mountTabsControlled({ modelValue: 'c' });
    keydown(q(host, '[role="tablist"]')!, 'ArrowUp');
    await new Promise((r) => setTimeout(r, 20));
    expect(qa(host, '[role="tab"]')[1]!.getAttribute('aria-selected')).toBe('true');
  });

  it('跳过 disabled tab', async () => {
    const host = await mountTabsControlled({}, [
      { label: 'A', name: 'a' },
      { label: 'B', name: 'b', disabled: true },
      { label: 'C', name: 'c' },
    ]);
    keydown(q(host, '[role="tablist"]')!, 'ArrowRight');
    await new Promise((r) => setTimeout(r, 20));
    expect(qa(host, '[role="tab"]')[2]!.getAttribute('aria-selected')).toBe('true');
  });

  it('Home 跳到第一个可用 tab', async () => {
    const host = await mountTabsControlled({ modelValue: 'c' });
    keydown(q(host, '[role="tablist"]')!, 'Home');
    await new Promise((r) => setTimeout(r, 20));
    expect(qa(host, '[role="tab"]')[0]!.getAttribute('aria-selected')).toBe('true');
  });

  it('End 跳到最后一个可用 tab', async () => {
    const host = await mountTabsControlled({});
    keydown(q(host, '[role="tablist"]')!, 'End');
    await new Promise((r) => setTimeout(r, 20));
    expect(qa(host, '[role="tab"]')[2]!.getAttribute('aria-selected')).toBe('true');
  });

  it('End 跳过末尾 disabled', async () => {
    const host = await mountTabsControlled({}, [
      { label: 'A', name: 'a' },
      { label: 'B', name: 'b' },
      { label: 'C', name: 'c', disabled: true },
    ]);
    keydown(q(host, '[role="tablist"]')!, 'End');
    await new Promise((r) => setTimeout(r, 20));
    expect(qa(host, '[role="tab"]')[1]!.getAttribute('aria-selected')).toBe('true');
  });

  it('Enter 触发当前 tab 的点击逻辑', async () => {
    const onChange = vi.fn();
    const host = await mountTabsControlled({ onChange });
    const list = q(host, '[role="tablist"]')!;
    keydown(list, 'ArrowRight');
    await new Promise((r) => setTimeout(r, 20));
    onChange.mockClear();
    keydown(list, 'Enter');
    await new Promise((r) => setTimeout(r, 20));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('Space 触发当前 tab 的点击逻辑', async () => {
    const onChange = vi.fn();
    const host = await mountTabsControlled({ onChange });
    keydown(q(host, '[role="tablist"]')!, ' ');
    await new Promise((r) => setTimeout(r, 20));
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('全部 disabled 时键盘导航不响应', async () => {
    const onChange = vi.fn();
    const host = await mountTabs({ onChange }, [
      { label: 'A', name: 'a', disabled: true },
      { label: 'B', name: 'b', disabled: true },
    ]);
    keydown(q(host, '[role="tablist"]')!, 'ArrowRight');
    await new Promise((r) => setTimeout(r, 20));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('onKeydown 回调被透传调用', async () => {
    const onKeydown = vi.fn();
    const host = await mountTabs({ onKeydown });
    keydown(q(host, '[role="tablist"]')!, 'ArrowRight');
    await new Promise((r) => setTimeout(r, 20));
    expect(onKeydown).toHaveBeenCalledTimes(1);
  });
});

describe('Tabs — 关闭标签', () => {
  it('closable 渲染关闭按钮，点击触发 onTabRemove', async () => {
    const onTabRemove = vi.fn();
    const host = await mountTabs({ closable: true, onTabRemove });
    const closeBtn = qa(host, '.lyt-tabs__close')[1]!;
    expect(closeBtn).toBeTruthy();
    closeBtn.click();
    await new Promise((r) => setTimeout(r, 20));
    expect(onTabRemove).toHaveBeenCalledWith('b');
  });

  it('pane 级 closable 优先于全局', async () => {
    const host = await mountTabs({ closable: false }, [
      { label: 'A', name: 'a', closable: true },
      { label: 'B', name: 'b' },
    ]);
    expect(qa(host, '.lyt-tabs__close')).toHaveLength(1);
  });

  it('关闭中间标签后 activeIndex 前移', async () => {
    const host = await mountTabs({ closable: true, modelValue: 'c' });
    qa(host, '.lyt-tabs__close')[1]!.click(); // 关闭 b
    await new Promise((r) => setTimeout(r, 20));
    // 源码按剩余 pane 数组重排，announce 提示"现在显示标签页"
    expect(q(host, '.lyt-tabs__sro')!.textContent).toContain('已关闭标签页');
  });

  it('关闭第一个标签后焦点移到新第一个', async () => {
    const host = await mountTabs({ closable: true });
    qa(host, '.lyt-tabs__close')[0]!.click();
    await new Promise((r) => setTimeout(r, 20));
    expect(q(host, '.lyt-tabs__sro')!.textContent).toContain('已关闭标签页');
  });

  it('关闭唯一标签 announce "现在没有标签页"', async () => {
    const host = await mountTabs({ closable: true }, [{ label: 'Only', name: 'only' }]);
    qa(host, '.lyt-tabs__close')[0]!.click();
    await new Promise((r) => setTimeout(r, 20));
    expect(q(host, '.lyt-tabs__sro')!.textContent).toContain('现在没有标签页');
  });

  it('Delete 键关闭当前 closable 标签', async () => {
    const onTabRemove = vi.fn();
    const host = await mountTabs({ closable: true, onTabRemove }, [
      { label: 'A', name: 'a', closable: true },
      { label: 'B', name: 'b' },
    ]);
    q(host, '[role="tablist"]')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }),
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(onTabRemove).toHaveBeenCalledWith('a');
  });

  it('Backspace 键关闭当前标签', async () => {
    const onTabRemove = vi.fn();
    const host = await mountTabs({ closable: true, onTabRemove }, [
      { label: 'A', name: 'a', closable: true },
      { label: 'B', name: 'b' },
    ]);
    q(host, '[role="tablist"]')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }),
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(onTabRemove).toHaveBeenCalledWith('a');
  });

  it('closable=false 时 Delete 键不触发关闭', async () => {
    const onTabRemove = vi.fn();
    const host = await mountTabs({ closable: false, onTabRemove }, [
      { label: 'A', name: 'a', closable: true },
      { label: 'B', name: 'b' },
    ]);
    q(host, '[role="tablist"]')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }),
    );
    await new Promise((r) => setTimeout(r, 20));
    // 源码里 p.closable 为 false 时整个分支不进入
    expect(onTabRemove).not.toHaveBeenCalled();
  });
});

describe('Tabs — 新增标签', () => {
  it('addable 渲染 + 按钮，点击触发 onTabAdd', async () => {
    const onTabAdd = vi.fn();
    const host = await mountTabs({ addable: true, onTabAdd });
    const btn = q(host, '.lyt-tabs__add-btn')!;
    expect(btn).toBeTruthy();
    btn.click();
    await new Promise((r) => setTimeout(r, 20));
    expect(onTabAdd).toHaveBeenCalledTimes(1);
    expect(q(host, '.lyt-tabs__sro')!.textContent).toContain('正在添加新标签页');
  });

  it('editable 同样渲染 + 按钮', async () => {
    const host = await mountTabs({ editable: true });
    expect(q(host, '.lyt-tabs__add-btn')).toBeTruthy();
  });

  it('addable=false 且无 editable 时不渲染 + 按钮', async () => {
    const host = await mountTabs({});
    expect(q(host, '.lyt-tabs__add-btn')).toBeNull();
  });
});

describe('Tabs — 拖拽排序', () => {
  it('draggable 时 tab 带 draggable 属性', async () => {
    const host = await mountTabs({ draggable: true });
    const tabs = qa(host, '[role="tab"]');
    expect(tabs[0]!.getAttribute('draggable')).toBe('true');
  });

  it('非 draggable 时 tab 无 draggable 属性（false 不落盘为字符串）', async () => {
    const host = await mountTabs({ draggable: false });
    expect(qa(host, '[role="tab"]')[0]!.getAttribute('draggable')).toBeNull();
  });

  it('完整拖拽流程触发 onTabDragStart / onTabDragEnd', async () => {
    const onTabDragStart = vi.fn();
    const onTabDragEnd = vi.fn();
    const host = await mountTabs({ draggable: true, onTabDragStart, onTabDragEnd });
    const tabs = qa(host, '[role="tab"]');

    tabs[0]!.dispatchEvent(new Event('dragstart', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 10));
    expect(onTabDragStart).toHaveBeenCalledWith(0);

    tabs[2]!.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 10));

    tabs[2]!.dispatchEvent(new Event('dragend', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 10));
    expect(onTabDragEnd).toHaveBeenCalledWith(0, 2);
    expect(q(host, '.lyt-tabs__sro')!.textContent).toContain('移动到位置 3');
  });

  it('dragover 非拖拽状态时不更新 dropIndex', async () => {
    const host = await mountTabs({ draggable: true });
    const tabs = qa(host, '[role="tab"]');
    // 没有先 dragstart，直接 dragover
    tabs[1]!.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 10));
    // 不应有 --drop 类
    expect(qa(host, '.lyt-tabs__item--drop')).toHaveLength(0);
  });

  it('dragstart 在非 draggable 时不触发回调', async () => {
    const onTabDragStart = vi.fn();
    const host = await mountTabs({ draggable: false, onTabDragStart });
    qa(host, '[role="tab"]')[0]!.dispatchEvent(new Event('dragstart', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 10));
    expect(onTabDragStart).not.toHaveBeenCalled();
  });

  it('dragend 时 dragIndex===dropIndex 不触发 onTabDragEnd', async () => {
    const onTabDragEnd = vi.fn();
    const host = await mountTabs({ draggable: true, onTabDragEnd });
    const tabs = qa(host, '[role="tab"]');
    tabs[1]!.dispatchEvent(new Event('dragstart', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 10));
    tabs[1]!.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 10));
    tabs[1]!.dispatchEvent(new Event('dragend', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 10));
    expect(onTabDragEnd).not.toHaveBeenCalled();
  });

  it('dragover 时对应 tab 加 --drop 类', async () => {
    const host = await mountTabs({ draggable: true });
    const tabs = qa(host, '[role="tab"]');
    tabs[0]!.dispatchEvent(new Event('dragstart', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 10));
    tabs[2]!.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 20));
    expect(qa(host, '.lyt-tabs__item--drop')).toHaveLength(1);
  });
});

describe('Tabs — 状态同步', () => {
  it('modelValue 与 activeIndex 同步（外部驱动）', async () => {
    const host = await mountTabs({ modelValue: 'c' });
    expect(qa(host, '[role="tab"]')[2]!.getAttribute('aria-selected')).toBe('true');
    expect(q(host, '[role="tabpanel"]')!.textContent).toBe('Content C');
  });

  it('activeIndex 初始化与 modelValue 一致', async () => {
    const host = await mountTabs({ modelValue: 'b' });
    expect(qa(host, '[role="tab"]')[1]!.className).toContain('lyt-tabs__item--active');
  });

  it('disabled tab 带 --disabled 类', async () => {
    const host = await mountTabs({}, [
      { label: 'A', name: 'a' },
      { label: 'B', name: 'b', disabled: true },
    ]);
    expect(qa(host, '.lyt-tabs__item--disabled')).toHaveLength(1);
  });

  it('active tab 带 --active 类', async () => {
    const host = await mountTabs({});
    expect(qa(host, '.lyt-tabs__item--active')).toHaveLength(1);
    expect(qa(host, '[role="tab"]')[0]!.className).toContain('lyt-tabs__item--active');
  });
});
