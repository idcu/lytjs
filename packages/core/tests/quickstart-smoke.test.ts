// @vitest-environment jsdom
/**
 * `@lytjs/core` 与 `@lytjs/core-signal` 的**入口差异**（记录，防止新手再踩）
 *
 * 实测结论（2026-09-25）：
 *   - `@lytjs/core-signal` 的 `createApp` **支持 `template` 字符串**（新手应该用它）
 *   - `@lytjs/core` 的 `createApp` **不认 `template` 字符串** ⇒ 挂载后**静默空白**（不报错！）
 *
 * 这个"静默空白"是新手最容易卡住的地方，故在此用测试固定住事实：
 * 若将来两者行为被统一（core 也支持 template），本文件会失败并提醒更新文档。
 */

import { describe, it, expect } from 'vitest';
import { createApp as createAppCore } from '../src/index';
import { createApp as createAppSignal } from '../../core-signal/src/index';

describe('core vs core-signal：createApp 对 template 的支持', () => {
  it('core-signal 支持 template 字符串（渲染出内容）', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    await createAppSignal({ template: '<div>from-signal</div>' }).mount(host);

    expect(host.innerHTML).toContain('from-signal');
    host.remove();
  });

  it('core 的 createApp 挂载 template 字符串会得到空白（记录现状，非期望行为）', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    // 不抛错，但也不会渲染出内容 —— 这正是"静默空白"的表现
    const app = createAppCore({ template: '<div>from-core</div>' } as never);
    await Promise.resolve(app.mount(host)).catch(() => undefined);

    expect(host.innerHTML).not.toContain('from-core');
    host.remove();
  });
});
