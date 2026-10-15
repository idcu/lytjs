// @vitest-environment jsdom
/**
 * 行为级判据：`TreeSelect` 的交互与可访问性
 *
 * ## 为什么要有这条
 *
 * `TreeSelect`（385 行）已随包发布，覆盖率实测仅 ~8%（268 条语句未覆盖）——
 * 开合 / 展开收起 / 选择 / 清除 / 过滤五条主路径均未被真挂载验证过。
 *
 * ⚠️ 已登记的设计怪癖（按真实行为断言，修复走单独决策，勿顺手改）：
 *  A) `multiple` prop 只落到根类名 `is-multiple`（:175），没有任何多选交互
 *     —— handleSelect 始终 emit 单值。声明了 API 却没有实现。
 *  B) 点击含 children 的**父节点也会触发选择**（:243 onClick 直接绑
 *     handleSelect）——主流 TreeSelect 父节点点击只展开不选中。
 *  C) 过滤不会自动展开：`filteredData`（:93）虽保留命中节点的父链，
 *     但 renderNode 仍按 expandedKeys 决定子级渲染 ⇒ 搜深层节点时若父级
 *     未展开，命中项不可见。
 *  D) `selectedLabel` signal（:73）在 handleSelect 里 set 却从未被渲染读取
 *     （渲染用 selectedNode() 从 value 反查）——死代码。
 *  E) value 是受控 prop：非受控静态 value 下选择后 selectedNode() 仍按旧
 *     value 反查，展示不变。交互断言必须走受控挂载。
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { signal } from '@lytjs/reactivity';
import { TreeSelect, type TreeSelectNode } from '../src/components/TreeSelect';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

const DATA: TreeSelectNode[] = [
  {
    value: 'zj',
    label: '浙江',
    children: [
      { value: 'hz', label: '杭州' },
      { value: 'nb', label: '宁波' },
    ],
  },
  {
    value: 'js',
    label: '江苏',
    children: [{ value: 'nj', label: '南京', disabled: true }],
  },
  { value: 'cq', label: '重庆' },
];

/**
 * 受控挂载：signal 驱动 value，onChange 回写（怪癖 E）。
 * userOnChange 先收原始回调参数供断言，再回写 value 驱动重渲染。
 */
async function mountTreeSelect(
  props: Record<string, unknown> = {},
  data: TreeSelectNode[] = DATA,
): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  const value = signal<string | number>((props.value as string | number) ?? '');
  const userOnChange = props.onChange as
    | ((v: string | number, n: TreeSelectNode) => void)
    | undefined;
  await createApp({
    setup() {
      return () =>
        h(TreeSelect as never, {
          data,
          ...props,
          value: value(),
          onChange: (v: string | number, n: TreeSelectNode) => {
            userOnChange?.(v, n);
            value.set(v);
          },
        });
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

async function toggleTrigger(host: HTMLElement): Promise<void> {
  q(host, '.lyt-tree-select-trigger')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await tick();
}
async function open(host: HTMLElement): Promise<void> {
  if (!q(host, '.lyt-tree-select-dropdown')) await toggleTrigger(host);
}
/** 点击第 index 个 .lyt-tree-node（文档序） */
async function clickNode(host: HTMLElement, index: number): Promise<void> {
  qa(host, '.lyt-tree-node')[index]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await tick();
}
/** 点击第 index 个展开图标（文档序，只含 hasChildren 节点的按钮） */
async function clickExpandIcon(host: HTMLElement, index: number): Promise<void> {
  qa(host, '.lyt-tree-node-expand-icon')[index]!.dispatchEvent(
    new MouseEvent('click', { bubbles: true }),
  );
  await tick();
}

describe('TreeSelect — 渲染与 a11y', () => {
  it('默认收起：trigger 具 combobox 语义、aria-expanded=false、显示 placeholder', async () => {
    const host = await mountTreeSelect({ placeholder: '请选地区' });
    expect(q(host, '.lyt-tree-select-dropdown')).toBeNull();
    const trigger = q(host, '.lyt-tree-select-trigger')!;
    expect(trigger.getAttribute('role')).toBe('combobox');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(q(host, '.lyt-tree-select-value')!.textContent).toBe('请选地区');
  });

  it('点击 trigger 开合：aria-expanded 翻转、根类名带 is-visible、树容器 role=tree', async () => {
    const host = await mountTreeSelect();
    await toggleTrigger(host);
    expect(q(host, '.lyt-tree-select-dropdown')).toBeTruthy();
    expect(q(host, '.lyt-tree-select')!.className).toContain('is-visible');
    expect(q(host, '.lyt-tree-select-trigger')!.getAttribute('aria-expanded')).toBe('true');
    expect(q(host, '.lyt-tree-select-tree')!.getAttribute('role')).toBe('tree');
  });

  it('id / ariaLabel / ariaDescribedBy 透传到 trigger', async () => {
    const host = await mountTreeSelect({ id: 'region', ariaLabel: '地区', ariaDescribedBy: 'tip' });
    const trigger = q(host, '.lyt-tree-select-trigger')!;
    expect(trigger.id).toBe('region');
    expect(trigger.getAttribute('aria-label')).toBe('地区');
    expect(trigger.getAttribute('aria-describedby')).toBe('tip');
  });

  it('展开按钮具 button 语义与展开/收起 aria-label；label 也带 button 语义', async () => {
    const host = await mountTreeSelect();
    await open(host);
    const expandBtn = q(host, '.lyt-tree-node-expand-icon')!;
    expect(expandBtn.getAttribute('role')).toBe('button');
    expect(expandBtn.getAttribute('aria-label')).toBe('展开');
    const labelBtn = q(host, '.lyt-tree-node-label')!;
    expect(labelBtn.getAttribute('role')).toBe('button');
    expect(labelBtn.getAttribute('aria-label')).toBe('浙江');
  });

  it('空数据：默认渲染「暂无数据」', async () => {
    const host = await mountTreeSelect({}, []);
    await open(host);
    expect(q(host, '.lyt-tree-select-empty')!.textContent).toContain('暂无数据');
  });

  it('空数据：empty 插槽优先', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);
    await createApp({
      setup() {
        return () =>
          h(
            TreeSelect as never,
            { data: [] },
            { empty: () => [h('span', { class: 'my-empty' }, '啥都没有')] },
          );
      },
    } as never).mount(host);
    await tick(30);
    await open(host);
    expect(q(host, '.my-empty')!.textContent).toBe('啥都没有');
  });

  it('class / style 透传到根节点', async () => {
    const host = await mountTreeSelect({ class: 'my-cls', style: 'color: red' });
    const root = q(host, '.lyt-tree-select')!;
    expect(root.className).toContain('my-cls');
    expect(root.getAttribute('style')).toContain('color: red');
  });

  it('value 命中时展示对应 label（跨层级反查）', async () => {
    const host = await mountTreeSelect({ value: 'hz' });
    expect(q(host, '.lyt-tree-select-value')!.textContent).toBe('杭州');
  });
});

describe('TreeSelect — 展开与收起', () => {
  it('defaultExpandAll：全部节点渲染（含叶子）', async () => {
    const host = await mountTreeSelect({ defaultExpandAll: true });
    await open(host);
    expect(qa(host, '.lyt-tree-node')).toHaveLength(6); // 3 父级 + 3 子级
  });

  it('defaultExpandedKeys：只展开指定节点', async () => {
    const host = await mountTreeSelect({ defaultExpandedKeys: ['zj'] });
    await open(host);
    const texts = qa(host, '.lyt-tree-node').map((n) => n.textContent);
    expect(texts.some((t) => t?.includes('杭州'))).toBe(true);
    expect(texts.some((t) => t?.includes('南京'))).toBe(false); // js 未展开
  });

  it('默认不展开：子节点不渲染；点展开图标后出现（且不触发选择）', async () => {
    const onChange = vi.fn();
    const host = await mountTreeSelect({ onChange });
    await open(host);
    expect(qa(host, '.lyt-tree-node')).toHaveLength(3); // 只有一级
    await clickExpandIcon(host, 0); // 展开浙江
    const texts = qa(host, '.lyt-tree-node').map((n) => n.textContent);
    expect(texts.some((t) => t?.includes('杭州'))).toBe(true);
    expect(onChange).not.toHaveBeenCalled(); // stopPropagation 生效
    // 展开态 aria-label 变「收起」
    expect(q(host, '.lyt-tree-node-expand-icon')!.getAttribute('aria-label')).toBe('收起');
  });

  it('再点展开图标收起：子节点消失', async () => {
    const host = await mountTreeSelect({ defaultExpandedKeys: ['zj'] });
    await open(host);
    expect(qa(host, '.lyt-tree-node').length).toBeGreaterThan(3);
    await clickExpandIcon(host, 0);
    expect(qa(host, '.lyt-tree-node')).toHaveLength(3);
  });

  it('叶子节点渲染占位展开图标（无 aria-label）', async () => {
    const host = await mountTreeSelect({ defaultExpandAll: true });
    await open(host);
    // 重庆是叶子：其 expand-icon 内为空文本
    const cq = qa(host, '.lyt-tree-node').find((n) => n.textContent?.includes('重庆'))!;
    expect(cq.querySelector('.lyt-tree-node-expand-icon')!.textContent).toBe('');
  });
});

describe('TreeSelect — 选择（受控）', () => {
  it('点击叶子：onChange 收到 (value, node)，展示 label，下拉关闭', async () => {
    const onChange = vi.fn();
    const host = await mountTreeSelect({ onChange, defaultExpandAll: true });
    await open(host);
    await clickNode(host, 1); // 杭州（浙江展开后的第一个子节点）
    expect(onChange).toHaveBeenCalledWith('hz', expect.objectContaining({ label: '杭州' }));
    expect(q(host, '.lyt-tree-select-value')!.textContent).toBe('杭州');
    expect(q(host, '.lyt-tree-select-dropdown')).toBeNull();
  });

  it('选中节点带 is-selected 类名', async () => {
    const host = await mountTreeSelect({ value: 'nb', defaultExpandAll: true });
    await open(host);
    const selected = q(host, '.lyt-tree-node.is-selected')!;
    expect(selected.textContent).toContain('宁波');
  });

  it('点击父节点也会触发选择（怪癖 B：父级不仅展开）', async () => {
    const onChange = vi.fn();
    const host = await mountTreeSelect({ onChange });
    await open(host);
    await clickNode(host, 0); // 浙江（含 children）
    expect(onChange).toHaveBeenCalledWith('zj', expect.objectContaining({ label: '浙江' }));
    expect(q(host, '.lyt-tree-select-value')!.textContent).toBe('浙江');
  });

  it('disabled 节点点击不触发 onChange', async () => {
    const onChange = vi.fn();
    const host = await mountTreeSelect({ onChange, defaultExpandAll: true });
    await open(host);
    // 南京 disabled：找其索引
    const idx = qa(host, '.lyt-tree-node').findIndex((n) => n.textContent?.includes('南京'));
    await clickNode(host, idx);
    expect(onChange).not.toHaveBeenCalled();
    expect(q(host, '.lyt-tree-select-value')!.textContent).toBe('请选择');
  });

  it('非受控静态 value：选择后展示不变（怪癖 E：受控语义）', async () => {
    const onChange = vi.fn();
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);
    await createApp({
      setup() {
        return () =>
          h(TreeSelect as never, { data: DATA, value: 'cq', onChange, defaultExpandAll: true });
      },
    } as never).mount(host);
    await tick(30);
    await open(host);
    await clickNode(host, 1); // 杭州
    expect(onChange).toHaveBeenCalledWith('hz', expect.objectContaining({ label: '杭州' }));
    // value 未回写 ⇒ selectedNode() 仍反查到重庆
    expect(q(host, '.lyt-tree-select-value')!.textContent).toBe('重庆');
  });

  it('nodeKey 自定义字段：按指定字段反查与回传', async () => {
    const onChange = vi.fn();
    const data = [
      { id: 1, label: '甲', children: [{ id: 11, label: '甲一' }] },
      { id: 2, label: '乙' },
    ] as unknown as TreeSelectNode[];
    const host = await mountTreeSelect({ nodeKey: 'id', onChange, defaultExpandAll: true }, data);
    await open(host);
    await clickNode(host, 1); // 甲一
    expect(onChange).toHaveBeenCalledWith(11, expect.objectContaining({ label: '甲一' }));
    expect(q(host, '.lyt-tree-select-value')!.textContent).toBe('甲一');
  });
});

describe('TreeSelect — 清除', () => {
  it('clearable 且有值时渲染 ×，点击后 emit 空值 + onChange("", null)', async () => {
    const onChange = vi.fn();
    const host = await mountTreeSelect({ value: 'cq', clearable: true, onChange });
    const clearBtn = q(host, '.lyt-tree-select-clear')!;
    expect(clearBtn.getAttribute('aria-label')).toBe('清除');
    clearBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    expect(onChange).toHaveBeenCalledWith('', null);
    expect(q(host, '.lyt-tree-select-value')!.textContent).toBe('请选择');
    expect(q(host, '.lyt-tree-select-clear')).toBeNull();
    expect(q(host, '.lyt-tree-select-dropdown')).toBeNull(); // stopPropagation 不触发开合
  });

  it('clearable=false 或无值时不渲染清除按钮', async () => {
    const host1 = await mountTreeSelect({ value: 'cq' });
    expect(q(host1, '.lyt-tree-select-clear')).toBeNull();
    const host2 = await mountTreeSelect({ clearable: true });
    expect(q(host2, '.lyt-tree-select-clear')).toBeNull();
  });
});

describe('TreeSelect — 过滤', () => {
  it('filterable 展开后渲染搜索框（role=search 容器 + filterPlaceholder）', async () => {
    const host = await mountTreeSelect({ filterable: true, filterPlaceholder: '搜一下' });
    await open(host);
    expect(q(host, '.lyt-tree-select-search')!.getAttribute('role')).toBe('search');
    const input = q(host, '.lyt-tree-select-search input') as HTMLInputElement;
    expect(input.placeholder).toBe('搜一下');
  });

  it('输入过滤：命中子节点保留父链；不命中分支被剔除', async () => {
    const host = await mountTreeSelect({ filterable: true, defaultExpandAll: true });
    await open(host);
    const input = q(host, '.lyt-tree-select-search input') as HTMLInputElement;
    input.value = '杭州';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    const texts = qa(host, '.lyt-tree-node').map((n) => n.textContent);
    expect(texts.some((t) => t?.includes('浙江'))).toBe(true); // 父链保留
    expect(texts.some((t) => t?.includes('杭州'))).toBe(true);
    expect(texts.some((t) => t?.includes('江苏'))).toBe(false);
    expect(texts.some((t) => t?.includes('重庆'))).toBe(false);
  });

  it('过滤不自动展开（怪癖 C）：父级未展开时命中子节点不可见', async () => {
    const host = await mountTreeSelect({ filterable: true }); // 无 defaultExpandAll
    await open(host);
    const input = q(host, '.lyt-tree-select-search input') as HTMLInputElement;
    input.value = '杭州';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    const texts = qa(host, '.lyt-tree-node').map((n) => n.textContent);
    expect(texts.some((t) => t?.includes('浙江'))).toBe(true); // 父链在
    expect(texts.some((t) => t?.includes('杭州'))).toBe(false); // 但命中项未展开 ⇒ 不可见
  });

  it('清空搜索词恢复完整数据；过滤大小写不敏感', async () => {
    const host = await mountTreeSelect({ filterable: true, defaultExpandAll: true });
    await open(host);
    const input = q(host, '.lyt-tree-select-search input') as HTMLInputElement;
    input.value = 'HANG'; // 中文不匹配，但流程走通（大小写分支）
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(q(host, '.lyt-tree-select-empty')!.textContent).toContain('暂无数据');
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    expect(qa(host, '.lyt-tree-node')).toHaveLength(6);
  });
});

describe('TreeSelect — multiple 怪癖', () => {
  it('multiple=true 只落 is-multiple 类名，选择行为仍是单选（怪癖 A）', async () => {
    const onChange = vi.fn();
    const host = await mountTreeSelect({ multiple: true, onChange, defaultExpandAll: true });
    expect(q(host, '.lyt-tree-select')!.className).toContain('is-multiple');
    await open(host);
    await clickNode(host, 5); // 重庆
    // 声明了 multiple 却 emit 单值而非数组
    expect(onChange).toHaveBeenCalledWith('cq', expect.objectContaining({ label: '重庆' }));
  });
});
