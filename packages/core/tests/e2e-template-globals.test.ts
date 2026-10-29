// @vitest-environment jsdom
/**
 * 端到端判据：模板表达式里的 **JS 全局对象**（`Math` / `String` / `JSON` …）
 *
 * ## 修之前实测
 *
 * ```
 * {{ Math.round(x) }}   → toDisplayString(_ctx.Math.round(_ctx.x))
 * {{ String(n) }}       → toDisplayString(_ctx.String(_ctx.n))
 * {{ new Date() }}      → new _ctx.Date()
 * {{ parseInt(s, 10) }} → _ctx.parseInt(_ctx.s, 10)
 * ```
 *
 * 编译器把所有裸标识符都改写成 `_ctx.xxx`，而白名单里**只有字面量与关键字**、
 * 没有任何全局对象 ⇒ 运行时 `Cannot read properties of undefined (reading 'round')`
 * 或 `_ctx.String is not a function`。
 *
 * 这是模板里最常见的写法之一，而报错指向的是**运行时的 `_ctx`** —— 很难联想到
 * 「编译器把全局当成了组件的属性」。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createApp, nextTick, ref } from '../src/index';
import { compile } from '@lytjs/compiler';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

async function mountHtml(comp: unknown): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  await createApp(comp as never).mount(host);
  await nextTick();
  return host;
}

const text = (el: HTMLElement) => (el.textContent ?? '').trim();

describe('模板里的 JS 全局：运行时', () => {
  it('Math.round 可用', async () => {
    const host = await mountHtml({
      setup: () => ({ x: 3.7 }),
      template: `<div>{{ Math.round(x) }}</div>`,
    });
    expect(text(host)).toBe('4');
  });

  it('String / Number 可用', async () => {
    const host = await mountHtml({
      setup: () => ({ n: 42 }),
      template: `<div>{{ String(n) }}|{{ Number('7') }}</div>`,
    });
    expect(text(host)).toBe('42|7');
  });

  it('JSON.stringify 可用', async () => {
    const host = await mountHtml({
      setup: () => ({ o: { a: 1 } }),
      template: `<div>{{ JSON.stringify(o) }}</div>`,
    });
    expect(text(host)).toBe('{"a":1}');
  });

  it('new Date() 可用', async () => {
    const host = await mountHtml({
      template: `<div>{{ new Date(0).getUTCFullYear() }}</div>`,
    });
    expect(text(host)).toBe('1970');
  });

  it('parseInt 与 Array.isArray 可用', async () => {
    const host = await mountHtml({
      setup: () => ({ s: '12px', a: [1] }),
      template: `<div>{{ parseInt(s, 10) }}|{{ Array.isArray(a) ? 'y' : 'n' }}</div>`,
    });
    expect(text(host)).toBe('12|y');
  });

  it('属性绑定里的全局同样可用', async () => {
    const host = await mountHtml({
      setup: () => ({ n: 5 }),
      template: `<div><span :title="String(n)">S</span></div>`,
    });
    expect(host.querySelector('span')!.getAttribute('title')).toBe('5');
  });

  it('局部名（v-for 别名）仍然优先于全局', async () => {
    // `Math` 在这里是 v-for 的别名，不该被当成全局、也不该加 `_ctx.`
    const host = await mountHtml({
      setup: () => ({ list: [{ id: 1 }, { id: 2 }] }),
      template: `<ul><li v-for="Math in list" :key="Math.id">{{ Math.id }}</li></ul>`,
    });
    expect(host.querySelectorAll('li').length).toBe(2);
    expect(text(host)).toBe('12');
  });

  it('响应式：依赖变化后全局调用的结果跟着变', async () => {
    const x = ref(1.2);
    const host = await mountHtml({
      setup: () => ({ x }),
      template: `<div>{{ Math.round(x) }}</div>`,
    });
    expect(text(host)).toBe('1');

    x.value = 2.6;
    await nextTick();
    expect(text(host)).toBe('3');
  });
});

describe('模板里的 JS 全局：编译产物', () => {
  it('不得出现 `_ctx.Math` / `_ctx.String` 这类前缀', () => {
    const cases = [
      '<div>{{ Math.round(x) }}</div>',
      '<div>{{ String(n) }}</div>',
      '<div>{{ JSON.stringify(o) }}</div>',
      '<div>{{ parseInt(s, 10) }}</div>',
    ];
    for (const tpl of cases) {
      const { code } = compile(tpl);
      expect(code).not.toMatch(/_ctx\.(Math|String|JSON|parseInt)\b/);
    }
  });

  it('用户自己的绑定仍然要加前缀（不能被白名单误伤）', () => {
    const { code } = compile('<div>{{ myMath.round(x) }}</div>');
    expect(code).toContain('_ctx.myMath');
  });
});
