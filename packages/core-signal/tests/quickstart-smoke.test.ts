// @vitest-environment jsdom
/**
 * 「小白快速开始」的冒烟验证（确保文档里的第一个例子真的能跑）
 *
 * 两个关键点（此前 README 的示例两条都踩了）：
 *   1. 支持 `template` 字符串的 `createApp` 来自 **@lytjs/core-signal**（不是 @lytjs/core）
 *   2. **`mount()` 返回 Promise，必须 await** —— 不 await 会得到空白页面（无报错）
 */

import { describe, it, expect } from 'vitest';
import { createApp } from '../src/index';

describe('快速开始示例（新手第一个例子）', () => {
  it('createApp + template 应挂载出内容（必须 await mount）', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const app = createApp({ template: '<div>hello lytjs</div>' });
    await app.mount(host);

    expect(host.innerHTML).toContain('hello lytjs');
    host.remove();
  });

  it('单个插值应渲染出来', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const app = createApp({
      setup() {
        return { msg: 'world' };
      },
      template: '<div>{{ msg }}</div>',
    });
    await app.mount(host);

    expect(host.innerHTML).toContain('world');
    host.remove();
  });

  // 该缺陷已修复（2026-09-26）：静态模板为每个插值留 `<!--lyt-t-->` 注释槽位，
  // 运行时 claimTextSlots() 换成独立文本节点 ⇒ 多个插值各写各的、不再互相覆盖。
  // 详见 docs/design/known-issue-multi-interpolation.md（已标记为已修复）。
  it('同一元素内多个插值应全部渲染（修复后升级为正式用例）', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const app = createApp({
      setup() {
        return { msg: 'world', n: 2 };
      },
      template: '<div>{{ msg }} / {{ n }}</div>',
    });
    await app.mount(host);

    expect(host.innerHTML).toContain('world');
    expect(host.innerHTML).toContain('2');
    host.remove();
  });

  it('mount 支持字符串选择器', async () => {
    const host = document.createElement('div');
    host.id = 'qs-app';
    document.body.appendChild(host);

    const app = createApp({ template: '<span>by-selector</span>' });
    await app.mount('#qs-app');

    expect(host.innerHTML).toContain('by-selector');
    host.remove();
  });
});
