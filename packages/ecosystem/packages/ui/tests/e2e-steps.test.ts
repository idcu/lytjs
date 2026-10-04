// @vitest-environment jsdom
/**
 * 行为级判据：`Steps` 的状态计算与切换回调
 *
 * ## 为什么要有这条
 *
 * 2026-10-04 实测发现：`Steps` 声明了 `active` / `processStatus` / `finishStatus` /
 * `onChange` 却**从未使用** ⇒ 「完成 / 进行中 / 等待」状态与切换回调**全都不生效**；
 * 同时它**只处理数组形态的 slot**，单节点 slot 内容被整个丢弃。
 *
 * 这类缺陷结构上无法被「直接调 `setup()` + mock props」风格的老测试抓到
 * ⇒ 这里用 `createApp` 真挂载 + 真实点击断言。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { Steps } from '../src/components/Steps';
import { Step } from '../src/components/Step';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

async function renderSteps(host: HTMLElement, props: Record<string, unknown> = {}): Promise<void> {
  await createApp({
    setup() {
      return () =>
        h(
          Steps as never,
          { active: 1, ...props },
          {
            default: () => [
              h(Step as never, { title: '一' }),
              h(Step as never, { title: '二' }),
              h(Step as never, { title: '三' }),
            ],
          },
        );
    },
  } as never).mount(host);
  await new Promise((r) => setTimeout(r, 30));
}

function classesOf(host: HTMLElement): string[] {
  return [...host.querySelectorAll('.lyt-step')].map((el) => el.className);
}

describe('行为：Steps 的状态与回调', () => {
  it('★ 按 active 分配完成/进行中/等待（此前全都不生效）', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);
    await renderSteps(host);

    const cls = classesOf(host);
    expect(cls).toHaveLength(3);
    expect(cls[0]).toContain('lyt-step--success'); // index 0 < active(1) ⇒ finishStatus
    expect(cls[1]).toContain('lyt-step--process'); // index === active ⇒ processStatus
    expect(cls[2]).toContain('lyt-step--wait'); // index > active
  });

  it('★ 自定义 finishStatus / processStatus 生效', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);
    await renderSteps(host, { finishStatus: 'error', processStatus: 'wait' });

    const cls = classesOf(host);
    expect(cls[0]).toContain('lyt-step--error');
    expect(cls[1]).toContain('lyt-step--wait');
  });

  it('★ 点击非当前步骤触发 onChange（带索引）', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);
    const seen: unknown[] = [];
    await renderSteps(host, { onChange: (i: number) => seen.push(i) });

    const steps = [...host.querySelectorAll('.lyt-step')];
    steps[2]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));

    expect(seen).toEqual([2]);
  });

  it('★ 点击当前步骤不触发 onChange', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);
    const seen: unknown[] = [];
    await renderSteps(host, { onChange: (i: number) => seen.push(i) });

    const steps = [...host.querySelectorAll('.lyt-step')];
    steps[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));

    expect(seen).toEqual([]);
  });
});
