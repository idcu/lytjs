// @vitest-environment jsdom
/**
 * `@lytjs/core` 与 `@lytjs/core-signal` 的**入口差异**（已收敛）
 *
 * 历史（2026-09-25 记录）：
 *   - `@lytjs/core-signal` 的 `createApp` 支持 `template` 字符串
 *   - `@lytjs/core` 的 `createApp` **不认** `template` ⇒ 挂载后**静默空白**（不报错！）
 *
 * ✅ 2026-09-26 已统一：`@lytjs/core` 也支持 `template`。
 * 修法见 `packages/core/src/template-compiler.ts`（运行时编译 + helper 注入）
 * 与 `packages/component/src/component-init.ts` 的
 * `setTemplateCompiler` 注入点 + `finishComponentSetup` 步骤 7 的 template 分支。
 *
 * 本文件按原注释的约定更新为「断言两者都支持」—— 若将来任一侧回归，这里会立刻失败。
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

  it('core 的 createApp 也支持 template 字符串（2026-09-26 统一后）', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const app = createAppCore({ template: '<div>from-core</div>' });
    await Promise.resolve(app.mount(host));

    expect(host.innerHTML).toContain('from-core');
    host.remove();
  });
});
