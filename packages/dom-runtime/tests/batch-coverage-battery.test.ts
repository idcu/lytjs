// @vitest-environment jsdom
/**
 * dom-runtime/batch.ts 覆盖率电池（2026-10-09 stmts 深挖第一批）
 * 此前 0 覆盖（294/294 语句未执行）。断言真实 DOM 行为，非形状断言。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  diffLists,
  insertBatch,
  remove,
  removeBatch,
  clearChildren,
  replaceChildren,
  updateTextBatch,
  setAttributeBatch,
  setClassBatch,
  createRenderScheduler,
  cancelScheduledRender,
  createVaporListRenderer,
  renderListsBatch,
} from '../src/batch';

describe('dom-runtime/batch · diffLists', () => {
  it('计算新增 / 删除 / 移动 / 更新', () => {
    const oldItems = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
      { id: 3, name: 'c' },
    ];
    const newItems = [
      { id: 2, name: 'b!' },
      { id: 1, name: 'a' },
      { id: 4, name: 'd' },
    ];
    const diff = diffLists(
      oldItems,
      newItems,
      (i) => i.id,
      (o, n) => o.name !== n.name,
    );
    expect(diff.added).toEqual([{ item: { id: 4, name: 'd' }, index: 2 }]);
    expect(diff.removed).toEqual([{ item: { id: 3, name: 'c' }, index: 2 }]);
    expect(diff.moved).toContainEqual({ item: { id: 2, name: 'b!' }, fromIndex: 1, toIndex: 0 });
    expect(diff.updated).toEqual([{ item: { id: 2, name: 'b!' }, index: 0 }]);
  });

  it('无 compareFn 时不产生 updated；moved 按fromIndex 排序', () => {
    const oldItems = [{ id: 3 }, { id: 1 }, { id: 2 }];
    const newItems = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const diff = diffLists(oldItems, newItems, (i) => i.id);
    expect(diff.updated).toHaveLength(0);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.moved.map((m) => m.fromIndex)).toEqual([0, 1, 2]); // 排序后 fromIndex 升序
    expect(diff.moved.map((m) => m.item.id).sort()).toEqual([1, 2, 3]);
  });

  it('removed 按 index 降序（供从后往前删除）', () => {
    const diff = diffLists([1, 2, 3, 4], [], (i) => i);
    expect(diff.removed.map((r) => r.index)).toEqual([3, 2, 1, 0]);
  });
});

describe('dom-runtime/batch · DOM 批量操作', () => {
  let container: HTMLDivElement;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });
  afterEach(() => {
    container.remove();
  });

  it('insertBatch：普通节点 / TemplateWrapper / ref 插入位', () => {
    const a = document.createElement('span');
    a.textContent = 'a';
    const wrapper = {
      content: (() => {
        const frag = document.createDocumentFragment();
        const t = document.createElement('b');
        t.textContent = 'tw';
        frag.appendChild(t);
        return frag;
      })(),
    };
    insertBatch([a, wrapper], container);
    expect(container.children).toHaveLength(2);
    expect(container.textContent).toBe('atw');

    const marker = document.createElement('i');
    container.appendChild(marker);
    const b = document.createElement('span');
    b.textContent = 'b';
    insertBatch([b], container, marker); // 插到 marker 之前
    expect(container.children[2]).toBe(b);
    expect(container.children[3]).toBe(marker);

    insertBatch([], container); // 空数组 no-op
    expect(container.children).toHaveLength(4);
  });

  it('remove：wrapper.remove() 分支 / 无 remove 的回退分支', () => {
    const a = document.createElement('span');
    container.appendChild(a);
    remove(a); // 元素自带 remove()
    expect(a.parentNode).toBeNull();

    const b = document.createElement('span');
    container.appendChild(b);
    Object.defineProperty(b, 'remove', { value: undefined }); // 逼回退分支
    remove(b);
    expect(b.parentNode).toBeNull();

    const orphan = document.createElement('span');
    remove(orphan); // 无父节点 → 不抛
  });

  it('removeBatch / clearChildren / replaceChildren（含 wrapper 与空数组）', () => {
    const kids = [document.createElement('p'), document.createElement('p')];
    kids.forEach((k) => container.appendChild(k));
    removeBatch(kids);
    expect(container.children).toHaveLength(0);

    container.innerHTML = '<i></i>';
    clearChildren(container);
    expect(container.innerHTML).toBe('');

    const wrapper = { content: document.createDocumentFragment() };
    const t = document.createTextNode('tw');
    wrapper.content.appendChild(t);
    replaceChildren(container, [wrapper]); // 清空 + 插入 wrapper 克隆
    expect(container.textContent).toBe('tw');

    replaceChildren(container, []); // 空数组 = 清空
    expect(container.innerHTML).toBe('');
  });

  it('updateTextBatch：只更新文本节点、相同文本跳过、长度取最小', () => {
    const t1 = document.createTextNode('x');
    const t2 = document.createTextNode('y');
    const el = document.createElement('div');
    container.append(t1, el, t2);
    const setSpy = vi.spyOn(t2, 'textContent', 'set');
    updateTextBatch([t1, el, t2, t1], ['A', 'ignored', 'B']);
    expect(t1.textContent).toBe('A');
    expect(t2.textContent).toBe('B');
    expect(setSpy).toHaveBeenCalledTimes(1); // 元素节点与越界项被跳过
    setSpy.mockRestore();

    updateTextBatch([t1], ['A']); // 相同文本不再 set（无变化不触发）
  });

  it('setAttributeBatch / setClassBatch（含 undefined 类名回退）', () => {
    const d1 = document.createElement('div');
    const d2 = document.createElement('div');
    setAttributeBatch([d1, d2, d1], 'data-id', ['1', '2']); // 长度取最小
    expect(d1.getAttribute('data-id')).toBe('1');
    expect(d2.getAttribute('data-id')).toBe('2');
    expect(d1.getAttributeNames().filter((n) => n === 'data-id')).toHaveLength(1);

    setClassBatch([d1, d2, d1], ['active', undefined as unknown as string]);
    expect(d1.className).toBe('active');
    expect(d2.className).toBe('');
  });
});

describe('dom-runtime/batch · createRenderScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('同一 tick 多次调用只渲染一次；pending 期间忽略新调用', () => {
    const renderFn = vi.fn();
    const schedule = createRenderScheduler(renderFn, 5);
    schedule();
    schedule();
    schedule();
    expect(renderFn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5);
    expect(renderFn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(50);
    expect(renderFn).toHaveBeenCalledTimes(1); // pending 复位后不再重复
  });

  it('渲染完成后可再次调度；cancelScheduledRender 为安全 no-op', () => {
    const renderFn = vi.fn();
    const schedule = createRenderScheduler(renderFn, 1);
    cancelScheduledRender(schedule); // 占位符，不应抛
    schedule();
    vi.advanceTimersByTime(1);
    expect(renderFn).toHaveBeenCalledTimes(1);
    schedule();
    vi.advanceTimersByTime(1);
    expect(renderFn).toHaveBeenCalledTimes(2);
  });
});

describe('dom-runtime/batch · createVaporListRenderer', () => {
  let container: HTMLUListElement;
  beforeEach(() => {
    container = document.createElement('ul');
    document.body.appendChild(container);
  });
  afterEach(() => {
    container.remove();
  });

  const setup = () => {
    const events: string[] = [];
    const renderer = createVaporListRenderer<{ id: number; name: string }>(container, {
      keyFn: (i) => i.id,
      renderItem: (item, index) => {
        const li = document.createElement('li');
        li.dataset.id = String(item.id);
        li.textContent = `${index}:${item.name}`;
        return li;
      },
      updateItem: (item, index, nodes) => {
        events.push(`update:${item.id}`);
        (nodes[0] as HTMLElement).textContent = `${index}:${item.name}`;
      },
      onMount: (item) => events.push(`mount:${item.id}`),
      onUnmount: (item) => events.push(`unmount:${item.id}`),
    });
    return { renderer, events };
  };

  it('首次渲染批量插入 + onMount', () => {
    const { renderer, events } = setup();
    renderer.render([
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ]);
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.textContent).toBe('0:a1:b');
    expect(events).toEqual(['mount:1', 'mount:2']);
    renderer.destroy();
  });

  it('完全替换走快速路径（全部重建）', () => {
    const { renderer, events } = setup();
    renderer.render([{ id: 1, name: 'a' }]);
    events.length = 0;
    renderer.render([
      { id: 2, name: 'b' },
      { id: 3, name: 'c' },
    ]);
    expect(events.filter((e) => e.startsWith('mount'))).toHaveLength(2);
    expect(container.textContent).toBe('0:b1:c');
    renderer.destroy();
  });

  it('增量更新：保留 / 删除 / 新增 / 移动混合（updateItem 为死代码，见下注）', () => {
    // ⚠️ 潜伏缺陷登记（2026-10-09）：createVaporListRenderer 调 diffLists 时未传 compareFn
    // （src/batch.ts:433），diff.updated 恒为空 ⇒ options.updateItem 永远不会触发。
    // 本测试按当前真实行为断言；修复属产品行为变更，走单独决策，勿在此顺手改。
    const { renderer, events } = setup();
    renderer.render([
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
      { id: 3, name: 'c' },
    ]);
    events.length = 0;
    renderer.render([
      { id: 3, name: 'C!' }, // 移动到首位（内容更新不会生效——updateItem 死代码）
      { id: 4, name: 'd' }, // 新增
      { id: 1, name: 'a' }, // 移动
      // id:2 被删除
    ]);
    const ids = [...container.querySelectorAll('li')].map((li) => li.dataset.id);
    expect(ids).toEqual(['3', '4', '1']);
    expect(container.querySelector('li')?.textContent).toBe('2:c'); // 旧节点原样保留
    expect(events).toContain('unmount:2');
    expect(events).toContain('mount:4');
    expect(events).not.toContain('update:3'); // 死代码的实证
    renderer.destroy();
  });

  it('destroy 清空容器并逐项 onUnmount', () => {
    const { renderer, events } = setup();
    renderer.render([
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ]);
    events.length = 0;
    renderer.destroy();
    expect(container.innerHTML).toBe('');
    expect(events).toEqual(['unmount:1', 'unmount:2']);
  });
});

describe('dom-runtime/batch · renderListsBatch', () => {
  it('批量渲染多个列表并在期间隐藏容器', () => {
    const c1 = document.createElement('div');
    const c2 = document.createElement('div');
    document.body.append(c1, c2);
    const mk = (el: HTMLElement) =>
      createVaporListRenderer<{ id: number }>(el, {
        keyFn: (i) => i.id,
        renderItem: (item) => {
          const s = document.createElement('span');
          s.textContent = String(item.id);
          return s;
        },
      });
    const r1 = mk(c1);
    const r2 = mk(c2);
    renderListsBatch([r1, r2], [[{ id: 1 }], [{ id: 2 }, { id: 3 }]]);
    expect(c1.textContent).toBe('1');
    expect(c2.textContent).toBe('23');
    expect(c1.style.display).toBe(''); // 恢复原 display
    expect(c2.style.display).toBe('');

    expect(() => renderListsBatch([r1], [])).toThrow('length must match');
    r1.destroy();
    r2.destroy();
    c1.remove();
    c2.remove();
  });
});
