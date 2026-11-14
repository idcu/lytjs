// @vitest-environment jsdom
/**
 * S24 模块级可变状态隔离：Transition 全局前缀
 *
 * ## 修复前实测
 *
 * `@lytjs/vdom` 的过渡类名前缀取自**全局默认前缀**
 * （`packages/vdom/src/transition.ts:81`）。`@lytjs/component` 的
 * `<Transition>` / `<TransitionGroup>` 在 `performEnterTransition` /
 * `performLeaveTransition` 里只传 `props`，没有把前缀固定到当前 app。
 *
 * 于是两个 app 同时挂载时，谁最后改全局前缀，**两个 app 的所有过渡类名都跟着变**：
 * 这里两个 app 各自的 `app.config.transitionPrefix` 在修复前会被完全忽略，
 * 两边都只看到全局的 `global`。
 *
 * ## 判据
 *
 * jsdom 没有 CSS 引擎，给元素设内联 `transition-duration: 100ms` 让 enter 变成
 * 异步收尾，就能在挂载后同步观察到 `-enter-active` 类名。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, Transition } from '../src/index';
import { setTransitionPrefix } from '@lytjs/vdom';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
  setTransitionPrefix('v');
});

function newHost(): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  return host;
}

const BOX = 'transition-duration: 100ms';

describe('S24 Transition 前缀按 app 隔离', () => {
  it('两个 app 同时挂载、各自设置不同前缀，enter 类名互不影响', async () => {
    // 全局默认值：修复前两个 app 都会读到它
    setTransitionPrefix('global');

    const appA = createApp({
      components: { Transition },
      setup() {
        return { on: true };
      },
      template: `<div><Transition appear><p class="box-a" style="${BOX}">A</p></Transition></div>`,
    } as never);
    (appA.config as Record<string, unknown>).transitionPrefix = 'alpha';

    const appB = createApp({
      components: { Transition },
      setup() {
        return { on: true };
      },
      template: `<div><Transition appear><p class="box-b" style="${BOX}">B</p></Transition></div>`,
    } as never);
    (appB.config as Record<string, unknown>).transitionPrefix = 'beta';

    const hostA = newHost();
    const hostB = newHost();
    await Promise.all([appA.mount(hostA), appB.mount(hostB)]);

    const a = hostA.querySelector('.box-a')!;
    const b = hostB.querySelector('.box-b')!;

    // 修复前：两边都是 global-enter-active —— 下面第一条断言红
    expect(a.className).toContain('alpha-enter-active');
    expect(b.className).toContain('beta-enter-active');
    expect(a.className).not.toContain('beta-');
    expect(b.className).not.toContain('alpha-');
  });
});
