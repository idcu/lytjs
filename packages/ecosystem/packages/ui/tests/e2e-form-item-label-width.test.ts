// @vitest-environment jsdom
/**
 * 行为级判据：`FormItem` 的 `labelWidth` 必须真正生效
 *
 * ## 为什么要有这条
 *
 * `Form.ts` 里 FormItem 的渲染逻辑已经写了 `p.labelWidth || '100px'`，
 * 上方注释还写着「现改为由 prop 驱动」，但 **props 声明里根本没有
 * `labelWidth`** ⇒ 传入的值只会落进 attrs（挂到根 div 上），
 * label 宽度恒为 100px。下方 `★` 用例在修复前**必红**。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { Form, FormItem } from '../src/components/Form';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

async function mountItem(props: Record<string, unknown>): Promise<HTMLElement> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  await createApp({
    setup() {
      return () =>
        h(Form as never, { model: {} }, () => [h(FormItem as never, props, () => h('input', {}))]);
    },
  } as never).mount(host);
  await new Promise((r) => setTimeout(r, 20));
  return host;
}

describe('FormItem — labelWidth 接线', () => {
  it('★ 传入 labelWidth 应作用到 label 宽度（改前恒为 100px）', async () => {
    const host = await mountItem({ label: 'Name', labelWidth: '200px' });
    const label = host.querySelector('.lyt-form-item__label') as HTMLElement;
    expect(label).toBeTruthy();
    expect(label.style.width).toBe('200px');
  });

  it('模板 kebab-case 写法 label-width 同样生效', async () => {
    const host = await mountItem({ label: 'Name', 'label-width': '160px' });
    const label = host.querySelector('.lyt-form-item__label') as HTMLElement;
    expect(label.style.width).toBe('160px');
  });

  it('未传 labelWidth 时保持原 100px 默认值（零行为变化）', async () => {
    const host = await mountItem({ label: 'Name' });
    const label = host.querySelector('.lyt-form-item__label') as HTMLElement;
    expect(label.style.width).toBe('100px');
  });
});
