// @vitest-environment jsdom
/**
 * 行为级判据：`createVaporListRenderer` 的 `updateItem` 是否真能被触发
 *
 * ## 为什么要有这条
 *
 * `VaporListOptions.updateItem` 是**公开声明并写进 JSDoc 示例**的选项，但
 * `createVaporListRenderer` 调 `diffLists(currentItems, items, keyFn)` 时**没传 `compareFn`**
 * ⇒ `diff.updated` 恒为空 ⇒ `batch.ts` 里那个 `if (cached && updateItem)` 分支**永不执行**
 * （登记见 `keel/NOW-history/2026-10-09-覆盖率分批与ADR0005.md` ①）。
 * 本电池给出「翻转 ⇒ 变红」的判据（修复前红）。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createVaporListRenderer } from '../src/batch';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

function makeHost(): HTMLElement {
  const h = document.createElement('div');
  document.body.appendChild(h);
  hosts.push(h);
  return h;
}

interface Row {
  id: number;
  name: string;
}

function renderRow(item: Row): Node {
  const d = document.createElement('span');
  d.textContent = item.name;
  return d;
}

describe('createVaporListRenderer — updateItem', () => {
  it('★ 同名 key 且 compareFn 判定"已变"时应调用 updateItem', () => {
    const host = makeHost();
    const calls: Array<[string, number]> = [];
    const r = createVaporListRenderer<Row>(host, {
      keyFn: (i) => i.id,
      renderItem: renderRow,
      compareFn: (a, b) => a.name !== b.name,
      updateItem: (item, index) => {
        calls.push([item.name, index]);
      },
    });
    r.render([
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ]);
    r.render([
      { id: 1, name: 'a!' },
      { id: 2, name: 'b' },
    ]);
    expect(calls).toEqual([['a!', 0]]);
    r.destroy();
  });

  it('compareFn 判定"未变"时不调用 updateItem', () => {
    const host = makeHost();
    const calls: string[] = [];
    const r = createVaporListRenderer<Row>(host, {
      keyFn: (i) => i.id,
      renderItem: renderRow,
      compareFn: (a, b) => a.name !== b.name,
      updateItem: (item) => {
        calls.push(item.name);
      },
    });
    r.render([{ id: 1, name: 'a' }]);
    r.render([{ id: 1, name: 'a' }]);
    expect(calls).toEqual([]);
    r.destroy();
  });

  it('未提供 compareFn 时 updateItem 不触发（显式 opt-in，不误伤性能）', () => {
    const host = makeHost();
    const calls: string[] = [];
    const r = createVaporListRenderer<Row>(host, {
      keyFn: (i) => i.id,
      renderItem: renderRow,
      updateItem: (item) => {
        calls.push(item.name);
      },
    });
    r.render([{ id: 1, name: 'a' }]);
    r.render([{ id: 1, name: 'a!' }]);
    expect(calls).toEqual([]);
    r.destroy();
  });
});
