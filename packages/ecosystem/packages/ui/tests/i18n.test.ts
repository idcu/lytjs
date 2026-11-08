// @vitest-environment jsdom
/**
 * i18n 基础设施判据（B05）
 *
 * 覆盖四件事：
 *   1. 默认 locale 是 zh-CN，词条逐字等于迁移前文案（零行为回归）；
 *   2. `setUiLocale` 运行时切换后，**渲染中的组件会跟着变**（不是只改全局变量）；
 *   3. 缺键 / 缺参数 / 未知 locale 都必须抛错 —— 绝不静默返回空串；
 *   4. zh-CN 与 en-US 键集合、占位符一致（门禁 `check-ui-i18n` 的运行时镜像）。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h } from '@lytjs/core';
import { createVNode, createTextVNode } from '@lytjs/core/runtime';
import { Pagination } from '../src/components/Pagination';
import { Empty } from '../src/components/Empty';
import { FALLBACK_LOCALE, UI_LOCALE_MESSAGES, getUiLocale, setUiLocale, t } from '../src/locale';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
  setUiLocale(FALLBACK_LOCALE);
});

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('i18n · locale 表', () => {
  it('默认 zh-CN，关键文案与迁移前逐字一致', () => {
    expect(getUiLocale()).toBe('zh-CN');
    expect(t('dialog.cancel')).toBe('取消');
    expect(t('dialog.confirm')).toBe('确定');
    expect(t('pagination.total', { total: 100 })).toBe('共 100 条');
    expect(t('pagination.pageSizeOption', { size: 10 })).toBe('10 条/页');
    expect(t('pagination.page', { page: 3 })).toBe('第3页');
  });

  it('zh-CN 与 en-US 键集合、占位符一致', () => {
    const zh = UI_LOCALE_MESSAGES['zh-CN'];
    const en = UI_LOCALE_MESSAGES['en-US'];
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(zh) as Array<keyof typeof zh>) {
      const zhParams = (zh[key].match(/\{(\w+)\}/g) ?? []).sort();
      const enParams = (en[key].match(/\{(\w+)\}/g) ?? []).sort();
      expect(enParams, key).toEqual(zhParams);
      expect(zh[key].trim(), key).not.toBe('');
      expect(en[key].trim(), key).not.toBe('');
    }
  });

  it('en-US 文案可用', () => {
    setUiLocale('en-US');
    expect(getUiLocale()).toBe('en-US');
    expect(t('pagination.total', { total: 100 })).toBe('100 total');
    expect(t('pagination.page', { page: 3 })).toBe('Page 3');
  });
});

describe('i18n · 运行时切换会触发组件重渲染', () => {
  it('渲染函数里读 t() 的组件，切换 locale 后文案同步变化', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);

    await createApp({
      setup() {
        return () =>
          createVNode('span', { class: 'probe' }, [createTextVNode(t('pagination.label'))]);
      },
    } as never).mount(host);
    await flush();
    expect(host.querySelector('.probe')!.textContent).toBe('分页');

    setUiLocale('en-US');
    await flush();
    expect(host.querySelector('.probe')!.textContent).toBe('Pagination');
  });

  it('分页器：运行时切到 en-US 后可见文案与 aria-label 同步变化', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);
    await createApp({
      setup() {
        return () => h(Pagination as never, { total: 100, current: 1, pageSize: 10 });
      },
    } as never).mount(host);
    await flush();
    expect(host.textContent).toContain('共 100 条');
    expect(host.querySelector('.lyt-pagination__prev')!.textContent).toBe('上一页');

    setUiLocale('en-US');
    await flush();
    expect(host.textContent).toContain('100 total');
    expect(host.querySelector('.lyt-pagination__prev')!.textContent).toBe('Previous page');
  });

  it('空状态：默认 description 跟随 locale（显式传值时以传入值为准）', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);
    await createApp({
      setup() {
        return () => h(Empty as never, {});
      },
    } as never).mount(host);
    await flush();
    expect(host.textContent).toContain('暂无数据');

    setUiLocale('en-US');
    await flush();
    expect(host.textContent).toContain('No data');
  });
});

describe('i18n · 缺键策略（显式失败，不静默）', () => {
  it('未知 locale 立即抛错', () => {
    expect(() => setUiLocale('fr-FR' as never)).toThrow(/Unknown locale/);
  });

  it('未知 key 抛错，而不是返回空串', () => {
    expect(() => t('missing.key' as never)).toThrow(/Missing i18n key/);
  });

  it('缺插值参数抛错，而不是保留花括号', () => {
    expect(() => t('pagination.total')).toThrow(/Missing i18n param "total"/);
  });
});
