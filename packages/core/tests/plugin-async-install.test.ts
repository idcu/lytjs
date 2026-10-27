/**
 * 异步 `install` 的失败必须被**接住**（P1 回归）
 *
 * 此前 `app.use()` 直接丢弃 `plugin.install()` 的返回值。而 `definePlugin` 的默认
 * `install` 是 `async`（内部 `await` 配置校验），一旦校验失败就变成
 * **unhandledRejection** —— Node 默认直接退出进程，浏览器只剩一条 console 记录。
 * 同批问题：「已安装」标记在真正装完之前就置位。
 */

import { describe, it, expect } from 'vitest';
import { createApp } from '../src/index';

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('异步插件安装（P1 回归）', () => {
  it('install 抛错时应交给 app.config.errorHandler', async () => {
    const app = createApp({ render: () => null });
    const captured: unknown[] = [];
    (app.config as { errorHandler?: unknown }).errorHandler = (err: unknown) => {
      captured.push(err);
    };

    app.use({
      name: 'bad-async',
      install: async () => {
        throw new Error('boom');
      },
    });

    await tick();

    expect(captured).toHaveLength(1);
    expect(String((captured[0] as Error).message)).toContain('boom');
  });

  it('install 成功时 afterInstall 才应执行', async () => {
    const app = createApp({ render: () => null });
    const order: string[] = [];

    app.use({
      name: 'good-async',
      install: async () => {
        await tick();
        order.push('install');
      },
      afterInstall: () => {
        order.push('afterInstall');
      },
    });

    // 同步返回时 afterInstall 还没跑（install 尚未完成）
    expect(order).toEqual([]);

    await tick();
    await tick();

    expect(order).toEqual(['install', 'afterInstall']);
  });

  it('同步 install 保持原有同步语义', () => {
    const app = createApp({ render: () => null });
    const order: string[] = [];

    app.use({
      name: 'sync-plugin',
      install: () => {
        order.push('install');
      },
      afterInstall: () => {
        order.push('afterInstall');
      },
    });

    expect(order).toEqual(['install', 'afterInstall']);
  });
});
