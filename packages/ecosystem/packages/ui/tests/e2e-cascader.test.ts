// @vitest-environment jsdom
/**
 * 行为级判据：`Cascader` 的交互与可访问性
 *
 * `Cascader`（385 行）已随包发布，覆盖率实测仅 ~8%（293 条语句未覆盖）——
 * 开合 / 逐级选择 / 多选标签 / 清除 / 过滤 / 懒加载六条主路径均未被真挂载验证。
 *
 * ⚠️ 已登记的设计怪癖（按真实行为断言，修复走单独决策，勿顺手改）：
 *  1) option onClick（Cascader.ts:222）无 stopPropagation，点击冒泡到根（:377）
 *     再 toggle 一次：点父级反而关闭，点叶子单选内部先关再被冒泡打开。
 *     ⇒ ensureOpen() 每次 option 点击后按真实开合态补开；断言只依赖回调与文本。
 *  2) 无 children 的节点必须显式 isLeaf:true 才可选（无 children≠叶子）。
 *  3) 过滤态 maxLevel=1（:333）只渲一级面板：filterOptions 保留了命中节点的
 *     父链数据，但嵌套命中项不渲染 ⇒ 搜「南京」只见「江苏」，不见「南京」。
 *  4) load 的 resolve 回调只原地改 option.children、不写 signal（:115-118），
 *     不触发重渲染；需要下一次信号变化才能看到子面板。
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { Cascader } from '../src/components/Cascader';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

const OPTIONS = [
  {
    label: '浙江',
    value: 'zj',
    children: [
      { label: '杭州', value: 'hz', isLeaf: true },
      { label: '宁波', value: 'nb', isLeaf: true },
    ],
  },
  {
    label: '江苏',
    value: 'js',
    children: [{ label: '南京', value: 'nj', isLeaf: true, disabled: true }],
  },
  { label: '直辖市', value: 'cq', isLeaf: true },
];

async function mountCascader(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  await createApp({
    setup() {
      return () => h(Cascader as never, { options: OPTIONS, ...props });
    },
  } as never).mount(host);
  await new Promise((r) => setTimeout(r, 30));
  return host;
}

const q = (host: HTMLElement, sel: string): HTMLElement | null =>
  host.querySelector(sel) as HTMLElement | null;
const qa = (host: HTMLElement, sel: string): HTMLElement[] =>
  [...host.querySelectorAll(sel)] as HTMLElement[];
const tick = (n = 20): Promise<void> => new Promise((r) => setTimeout(r, n));

/** 直接点根节点（目标即根，不经冒泡），只触发一次 toggle */
async function toggleRoot(host: HTMLElement): Promise<void> {
  q(host, '.lyt-cascader')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await tick();
}
async function open(host: HTMLElement): Promise<void> {
  if (!q(host, '.lyt-cascader__dropdown')) await toggleRoot(host);
}
/** option 点击会冒泡双 toggle（怪癖 1），按真实开合态补开 */
async function ensureOpen(host: HTMLElement): Promise<void> {
  await tick();
  if (!q(host, '.lyt-cascader__dropdown')) await toggleRoot(host);
}
async function clickOption(host: HTMLElement, panelIndex: number, optionIndex: number) {
  const panel = qa(host, '.lyt-cascader__panel')[panelIndex]!;
  qa(panel, '.lyt-cascader__option')[optionIndex]!.click();
  await ensureOpen(host);
}

describe('Cascader — 渲染与 a11y', () => {
  it('默认收起：combobox 语义、aria-expanded=false、显示 placeholder', async () => {
    const host = await mountCascader({ placeholder: '请选地区' });
    expect(q(host, '.lyt-cascader__dropdown')).toBeNull();
    const trigger = q(host, '.lyt-cascader__trigger')!;
    expect(trigger.getAttribute('role')).toBe('combobox');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(q(host, '.lyt-cascader__placeholder')!.textContent).toBe('请选地区');
  });

  it('点击根节点开合，aria-expanded 翻转，根类名带 --open', async () => {
    const host = await mountCascader();
    await toggleRoot(host);
    expect(q(host, '.lyt-cascader__dropdown')).toBeTruthy();
    expect(q(host, '.lyt-cascader')!.className).toContain('lyt-cascader--open');
    expect(q(host, '.lyt-cascader__trigger')!.getAttribute('aria-expanded')).toBe('true');
    expect(qa(host, '.lyt-cascader__panel')).toHaveLength(1);
    expect(qa(host, '.lyt-cascader__panel')[0]!.textContent).toContain('浙江');
  });

  it('onVisibleChange 收到开合状态', async () => {
    const onVisibleChange = vi.fn();
    const host = await mountCascader({ onVisibleChange });
    await toggleRoot(host);
    expect(onVisibleChange).toHaveBeenLastCalledWith(true);
    await toggleRoot(host);
    expect(onVisibleChange).toHaveBeenLastCalledWith(false);
  });

  it('disabled：点击不开合、不带 --open、不触发 onVisibleChange', async () => {
    const onVisibleChange = vi.fn();
    const host = await mountCascader({ disabled: true, onVisibleChange });
    await toggleRoot(host);
    expect(q(host, '.lyt-cascader__dropdown')).toBeNull();
    expect(q(host, '.lyt-cascader')!.className).toContain('lyt-cascader--disabled');
    expect(onVisibleChange).not.toHaveBeenCalled();
  });

  it('父级 option 渲染 ▶ 箭头，叶子不渲染', async () => {
    const host = await mountCascader();
    await open(host);
    const panel = qa(host, '.lyt-cascader__panel')[0]!;
    const opts = qa(panel, '.lyt-cascader__option');
    expect(opts[0]!.querySelector('.lyt-cascader__arrow')).toBeTruthy();
    expect(opts[2]!.querySelector('.lyt-cascader__arrow')).toBeNull();
  });

  it('id / ariaLabel 透传到 trigger', async () => {
    const host = await mountCascader({ id: 'region', ariaLabel: '地区选择' });
    const trigger = q(host, '.lyt-cascader__trigger')!;
    expect(trigger.id).toBe('region');
    expect(trigger.getAttribute('aria-label')).toBe('地区选择');
  });

  it('空数据：默认渲染「暂无数据」', async () => {
    const host = await mountCascader({ options: [] });
    await open(host);
    expect(q(host, '.lyt-cascader__dropdown')!.textContent).toContain('暂无数据');
  });

  it('空数据：empty 插槽优先', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);
    await createApp({
      setup() {
        return () =>
          h(
            Cascader as never,
            { options: [] },
            { empty: () => [h('span', { class: 'my-empty' }, '真的没有')] },
          );
      },
    } as never).mount(host);
    await tick(30);
    await open(host);
    expect(q(host, '.my-empty')!.textContent).toBe('真的没有');
  });

  it('default 插槽收到 option 参数自定义内容', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);
    await createApp({
      setup() {
        return () =>
          h(
            Cascader as never,
            { options: OPTIONS },
            {
              default: (opt: { label: string }) => [
                h('b', { class: 'custom-opt' }, `★${opt.label}`),
              ],
            },
          );
      },
    } as never).mount(host);
    await tick(30);
    await open(host);
    expect(qa(host, '.custom-opt')[0]!.textContent).toBe('★浙江');
  });
});

describe('Cascader — 单选', () => {
  it('逐级展开后选择叶子：onChange 收到完整路径，展示全路径', async () => {
    const onChange = vi.fn();
    const host = await mountCascader({ onChange });
    await open(host);
    await clickOption(host, 0, 0); // 浙江（冒泡关一下，ensureOpen 补开）
    expect(qa(host, '.lyt-cascader__panel')).toHaveLength(2);
    await clickOption(host, 1, 0); // 杭州（叶子）
    expect(onChange).toHaveBeenCalledWith(['zj', 'hz']);
    expect(q(host, '.lyt-cascader__value')!.textContent).toBe('浙江 / 杭州');
  });

  it('showAllLevels=false 只展示末级', async () => {
    const host = await mountCascader({ modelValue: ['zj', 'hz'], showAllLevels: false });
    expect(q(host, '.lyt-cascader__value')!.textContent).toBe('杭州');
  });

  it('自定义分隔符 + 全路径', async () => {
    const host = await mountCascader({ modelValue: ['zj', 'nb'], separator: ' -> ' });
    expect(q(host, '.lyt-cascader__value')!.textContent).toBe('浙江 -> 宁波');
  });

  it('直接选择一级叶子', async () => {
    const onChange = vi.fn();
    const host = await mountCascader({ onChange });
    await open(host);
    await clickOption(host, 0, 2); // 直辖市
    expect(onChange).toHaveBeenCalledWith(['cq']);
    expect(q(host, '.lyt-cascader__value')!.textContent).toBe('直辖市');
  });

  it('modelValue 初始化回显全路径文本（不恢复 activePath，选中态不回显——缺陷登记）', async () => {
    const host = await mountCascader({ modelValue: ['js', 'nj'] });
    expect(q(host, '.lyt-cascader__value')!.textContent).toBe('江苏 / 南京');
  });

  it('点击 disabled option 不触发 onChange', async () => {
    const onChange = vi.fn();
    const host = await mountCascader({ onChange });
    await open(host);
    await clickOption(host, 0, 1); // 江苏
    await clickOption(host, 1, 0); // 南京（disabled，selectOption 早退）
    expect(onChange).not.toHaveBeenCalled();
  });

  it('无 children 且未标 isLeaf 的节点点击无效果（缺陷登记：约定不一致）', async () => {
    const onChange = vi.fn();
    const options = [{ label: 'X', value: 'x', children: [{ label: 'y', value: 'y' }] }];
    const host = await mountCascader({ options, onChange });
    await open(host);
    await clickOption(host, 0, 0);
    await clickOption(host, 1, 0); // y 无 isLeaf 且无 load ⇒ 不选中也不懒加载
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('Cascader — 懒加载', () => {
  it('无 children 且提供 load：调用 load(option, resolve)，resolve 后需一次信号变化才出子面板（怪癖 4）', async () => {
    let resolveFn: ((children: unknown[]) => void) | null = null;
    const load = vi.fn((_opt: unknown, resolve: (children: unknown[]) => void) => {
      resolveFn = resolve;
    });
    const options = [{ label: '动态', value: 'dyn' }];
    const host = await mountCascader({ options, load });
    await open(host);
    await clickOption(host, 0, 0);
    expect(load).toHaveBeenCalledTimes(1);
    expect(load.mock.calls[0]![0]).toMatchObject({ value: 'dyn' });
    // resolve 只原地改 option.children，不写 signal；用两次根点击强制一次重渲染
    resolveFn!([{ label: '异步子项', value: 'child', isLeaf: true }]);
    await toggleRoot(host);
    await toggleRoot(host);
    expect(qa(host, '.lyt-cascader__panel')).toHaveLength(2);
    expect(qa(host, '.lyt-cascader__panel')[1]!.textContent).toContain('异步子项');
  });
});

describe('Cascader — 多选', () => {
  it('modelValue 初始化渲染标签（全路径文本）', async () => {
    const host = await mountCascader({ multiple: true, modelValue: [['zj', 'hz']] });
    const tags = qa(host, '.lyt-cascader__tag');
    expect(tags).toHaveLength(1);
    expect(tags[0]!.textContent).toContain('浙江 / 杭州');
  });

  it('选中叶子进入标签列表，再点一次取消；onChange 收到路径数组', async () => {
    const onChange = vi.fn();
    const host = await mountCascader({ multiple: true, onChange });
    await open(host);
    await clickOption(host, 0, 2); // 直辖市
    expect(onChange).toHaveBeenLastCalledWith([['cq']]);
    expect(qa(host, '.lyt-cascader__tag')).toHaveLength(1);
    await clickOption(host, 0, 2); // 再点取消
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(qa(host, '.lyt-cascader__tag')).toHaveLength(0);
  });

  it('标签 × 触发 onRemoveTag / onChange（剩余路径数组；× 无 stopPropagation 会冒泡）', async () => {
    const onRemoveTag = vi.fn();
    const onChange = vi.fn();
    const host = await mountCascader({
      multiple: true,
      modelValue: [['zj', 'hz'], ['cq']],
      onRemoveTag,
      onChange,
    });
    qa(host, '.lyt-cascader__tag-close')[0]!.click();
    await tick();
    expect(onRemoveTag).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([['cq']]);
    expect(qa(host, '.lyt-cascader__tag')).toHaveLength(1);
  });

  it('collapseTags 类名落到根节点', async () => {
    const host = await mountCascader({
      multiple: true,
      collapseTags: true,
      modelValue: [['cq']],
    });
    expect(q(host, '.lyt-cascader')!.className).toContain('lyt-cascader--collapse-tags');
  });

  it('disabled 时标签 × 不触发移除', async () => {
    const onRemoveTag = vi.fn();
    const host = await mountCascader({
      multiple: true,
      disabled: true,
      modelValue: [['cq']],
      onRemoveTag,
    });
    qa(host, '.lyt-cascader__tag-close')[0]!.click();
    await tick();
    expect(onRemoveTag).not.toHaveBeenCalled();
  });
});

describe('Cascader — 清除', () => {
  it('有值时渲染清除按钮，点击清空并触发 onClear / onChange([])（clear 阻止冒泡，下拉保持关闭）', async () => {
    const onClear = vi.fn();
    const onChange = vi.fn();
    const host = await mountCascader({ modelValue: ['cq'], onClear, onChange });
    expect(q(host, '.lyt-cascader__clear')).toBeTruthy();
    q(host, '.lyt-cascader__clear')!.click();
    await tick();
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([]);
    expect(q(host, '.lyt-cascader__placeholder')!.textContent).toBe('请选择');
    expect(q(host, '.lyt-cascader__clear')).toBeNull();
    expect(q(host, '.lyt-cascader__dropdown')).toBeNull();
  });

  it('clearable=false 时不渲染清除按钮', async () => {
    const host = await mountCascader({ modelValue: ['cq'], clearable: false });
    expect(q(host, '.lyt-cascader__clear')).toBeNull();
  });
});

describe('Cascader — 过滤', () => {
  it('filterable 展开后出现搜索框；命中子节点保留父级但嵌套命中不渲染（怪癖 3）', async () => {
    const host = await mountCascader({ filterable: true });
    await open(host);
    const input = q(host, '.lyt-cascader__search input') as HTMLInputElement;
    expect(input).toBeTruthy();
    input.value = '南京';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    const dropdown = q(host, '.lyt-cascader__dropdown')!;
    expect(dropdown.textContent).toContain('江苏');
    expect(dropdown.textContent).not.toContain('浙江');
    expect(dropdown.textContent).not.toContain('南京'); // 只渲一级，真正命中项不可见
    expect(qa(host, '.lyt-cascader__panel')).toHaveLength(1);
  });

  it('清空搜索词恢复完整选项', async () => {
    const host = await mountCascader({ filterable: true });
    await open(host);
    const input = q(host, '.lyt-cascader__search input') as HTMLInputElement;
    input.value = '南京';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(qa(host, '.lyt-cascader__panel')[0]!.textContent).toContain('浙江');
  });
});
