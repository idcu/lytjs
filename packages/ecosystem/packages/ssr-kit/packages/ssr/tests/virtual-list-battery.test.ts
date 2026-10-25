/**
 * 行为级判据：`@lytjs/ssr` 的 **VirtualList**（`src/virtualList.ts`，108 行）
 *
 * ## 为什么要有这条
 *
 * 覆盖率 **15.3%**（85 条语句 72 条空档）。虚拟列表的**全部价值都在"窗口算得对不对"**：
 * 算错的表现不是崩，而是「滚到一半列表空了」或「一次渲染一万个节点」——前者用户可见，
 * 后者正是它要解决的问题。
 *
 * ## 手法
 *
 * 不挂 DOM：`setup()` 拿到 render，再从渲染出的 vnode 树里取出 `onScroll` 回调，
 * 手动投递 `{ target: { scrollTop } }` 来驱动滚动，断言窗口区间、偏移、总高与插槽参数。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VirtualList } from '../src/virtualList';

type VNodeLike = { type?: unknown; props?: Record<string, unknown>; children?: unknown };

const items = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i }));

/** 挂载：返回 render 与插槽 spy */
function setupList(props: Record<string, unknown>, withSlots = true) {
  const slotSpy = vi.fn((scope: { item: unknown; index: number }) => [
    { type: 'span', children: String(scope.index) },
  ]);
  const slots = withSlots ? { default: slotSpy } : {};

  const setup = (
    VirtualList as unknown as {
      setup: (p: Record<string, unknown>, ctx: unknown) => () => VNodeLike;
    }
  ).setup;
  const render = setup(
    {
      data: items(100),
      itemHeight: 50,
      height: 400,
      buffer: 5,
      class: '',
      ...props,
    },
    { slots },
  ) as () => VNodeLike;

  return { render, slotSpy };
}

/** root > content > visible */
function parts(vnode: VNodeLike) {
  const content = (vnode.children as VNodeLike[])[0]!;
  const visible = (content.children as VNodeLike[])[0]!;
  return { content, visible, items: visible.children as VNodeLike[] };
}

/**
 * ⚠️ `createVNode` 会把 **style 字符串规范化成对象**（`normalizeStyleObject`），
 *    所以断言要读对象字段，`String(props.style)` 只会得到 `[object Object]`。
 *    （第一版就是这么写的，四条用例一起假红 —— 又是一次「夹具前提错」而不是产品错。）
 */
const styleOf = (vnode: VNodeLike) => (vnode.props?.style ?? {}) as Record<string, string>;

const scrollTo = (vnode: VNodeLike, top: number) => {
  const onScroll = vnode.props?.onScroll as (e: unknown) => void;
  onScroll({ target: { scrollTop: top } });
};

beforeEach(() => {
  vi.restoreAllMocks();
});

// ==================== 结构 ====================

describe('渲染结构', () => {
  it('root 是带 class 与滚动事件的 div', () => {
    const { render } = setupList({});
    const vnode = render();

    expect(vnode.type).toBe('div');
    expect(String(vnode.props?.class)).toContain('lyt-virtual-list');
    expect(typeof vnode.props?.onScroll).toBe('function');
  });

  it('三层嵌套：root > content > visible', () => {
    const { render } = setupList({});
    const { content, visible } = parts(render());

    expect(String(content.props?.class)).toContain('lyt-virtual-list__content');
    expect(String(visible.props?.class)).toContain('lyt-virtual-list__visible');
  });

  it('content 高度 = 总条数 × 行高（滚动条长度靠它）', () => {
    const { render } = setupList({});
    const { content } = parts(render());

    expect(styleOf(content).height).toBe('5000px');
  });

  it('props.class 会被追加到根 class 上', () => {
    const { render } = setupList({ class: 'my-list' });

    expect(String(render().props?.class)).toBe('lyt-virtual-list my-list');
  });
});

// ==================== 窗口计算 ====================

describe('可见窗口', () => {
  it('scrollTop=0 ⇒ 从 0 开始，渲染 ceil(h/ih)+2*buffer 条', () => {
    const { render } = setupList({});
    const { items: rendered } = parts(render());

    // ceil(400/50)=8，buffer=5 ⇒ 8 + 10 = 18
    expect(rendered).toHaveLength(18);
    expect(rendered[0]!.props?.['data-index']).toBe(0);
  });

  it('★ 滚动后窗口整体下移，且条数不变（缓冲带上移）', () => {
    const { render } = setupList({});
    const vnode = render();
    scrollTo(vnode, 500);

    const { items: rendered, visible } = parts(render());

    // start = floor(500/50) - 5 = 5；end = 5 + 18 = 23
    expect(rendered).toHaveLength(18);
    expect(rendered[0]!.props?.['data-index']).toBe(5);
    expect(rendered[rendered.length - 1]!.props?.['data-index']).toBe(22);
    // offset = 5 * 50 = 250
    expect(styleOf(visible).top).toBe('250px');
  });

  it('滚到接近末尾 ⇒ 窗口被 data.length 截断（不越界、不出空行）', () => {
    const { render } = setupList({});
    const vnode = render();
    scrollTo(vnode, 4950); // start = 99 - 5 = 94

    const { items: rendered } = parts(render());

    expect(rendered).toHaveLength(100 - 94);
    expect(rendered[rendered.length - 1]!.props?.['data-index']).toBe(99);
  });

  it('★ 滚过头（超出内容高度）⇒ 空窗口，不抛', () => {
    const { render } = setupList({});
    const vnode = render();

    expect(() => scrollTo(vnode, 999_999)).not.toThrow();
    expect(parts(render()).items).toHaveLength(0);
  });

  it('空数据 ⇒ 0 条、总高 0', () => {
    const { render } = setupList({ data: [] });
    const vnode = render();

    expect(parts(vnode).items).toHaveLength(0);
    expect(styleOf(parts(vnode).content).height).toBe('0px');
  });

  it('buffer=0 ⇒ 只渲染可视条数', () => {
    const { render } = setupList({ buffer: 0 });
    const { items: rendered } = parts(render());

    expect(rendered).toHaveLength(8); // ceil(400/50)
  });
});

// ==================== 插槽与行 ====================

describe('行与插槽', () => {
  it('每行带 class / 行高 / data-index', () => {
    const { render } = setupList({});
    const first = parts(render()).items[0]!;

    expect(String(first.props?.class)).toBe('lyt-virtual-list__item');
    expect(styleOf(first).height).toBe('50px');
    expect(first.props?.['data-index']).toBe(0);
  });

  it('★ 插槽收到的是 { item, index }，且 index 是**绝对下标**（不是窗口内下标）', () => {
    const { render, slotSpy } = setupList({});
    const vnode = render();
    scrollTo(vnode, 500);
    render();

    const lastCall = slotSpy.mock.calls[slotSpy.mock.calls.length - 1]![0] as {
      item: unknown;
      index: number;
    };
    expect(lastCall.index).toBe(22);
    expect(lastCall.item).toEqual({ id: 22 });
  });

  it('没有默认插槽 ⇒ 行仍生成（children 为空，不崩）', () => {
    const { render } = setupList({}, false);
    const { items: rendered } = parts(render());

    expect(rendered).toHaveLength(18);
    expect(rendered[0]!.children ?? null).toBeNull();
  });
});
