// @vitest-environment jsdom
/**
 * 端到端门禁：`v-bind="obj"` 对象展开
 *
 * 2026-10-29 实测：`<div v-bind="attrs">` 的产物是 `createBlock("div", null)` ——
 * **一个属性都没上**，且不报错。编译期对「v-bind 不带参数」根本没有分支。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createApp, ref, nextTick } from '../src/index';
import { compile } from '@lytjs/compiler';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const el of hosts.splice(0)) el.remove();
});

async function flush(): Promise<void> {
  await nextTick();
  await new Promise((r) => setTimeout(r, 20));
}

async function mountApp(comp: unknown): Promise<HTMLElement> {
  const el = document.createElement('div');
  document.body.appendChild(el);
  hosts.push(el);
  await createApp(comp as never).mount(el);
  await flush();
  return el;
}

describe('v-bind 对象展开', () => {
  it('普通属性要展开到 DOM 上', async () => {
    const el = await mountApp({
      setup() {
        return { attrs: { id: 'x', title: 'T' } };
      },
      template: '<div id="app"><span v-bind="attrs">S</span></div>',
    });

    const span = el.querySelector('span')!;
    expect(span.id).toBe('x');
    expect(span.getAttribute('title')).toBe('T');
  });

  it('class / style 也要展开', async () => {
    const el = await mountApp({
      setup() {
        return { attrs: { class: 'c1', style: 'color: red' } };
      },
      template: '<div id="app"><span v-bind="attrs">S</span></div>',
    });

    const span = el.querySelector('span') as HTMLElement;
    expect(span.className).toContain('c1');
    expect(span.style.color).toBe('red');
  });

  it('对象变化后属性跟着更新', async () => {
    const attrs = ref<Record<string, string>>({ title: 'A' });
    const el = await mountApp({
      setup() {
        return { attrs };
      },
      template: '<div id="app"><span v-bind="attrs">S</span></div>',
    });

    expect(el.querySelector('span')!.getAttribute('title')).toBe('A');

    attrs.value = { title: 'B' };
    await flush();
    expect(el.querySelector('span')!.getAttribute('title')).toBe('B');
  });

  it('与静态属性共存时都要保留（静态在前，展开在后）', async () => {
    const el = await mountApp({
      setup() {
        return { attrs: { title: 'T' } };
      },
      template: '<div id="app"><span id="fixed" v-bind="attrs">S</span></div>',
    });

    const span = el.querySelector('span')!;
    expect(span.id).toBe('fixed');
    expect(span.getAttribute('title')).toBe('T');
  });

  it('编译期判据：必须产出展开语法', () => {
    const { code } = compile('<div v-bind="attrs">S</div>');

    expect(code).toContain('..._ctx.attrs');
  });
});
