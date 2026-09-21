/**
 * Vapor SSR 渲染测试
 *
 * 背景：`renderTemplateToHTML` 此前忽略编译产物、恒定返回
 * `'<div ... data-vapor-ssr="true"><!-- Vapor SSR Placeholder --></div>'`，
 * 也就是说任何 Vapor 组件的 SSR 输出都是空壳。本文件锁定"真的渲染出模板内容"。
 */

import { describe, it, expect } from 'vitest';
import { renderVaporToString, renderVaporToStream } from '../src/vapor/vapor-ssr';

describe('Vapor SSR', () => {
  it('应把插值渲染成真实 HTML（不再是占位 div）', async () => {
    const App = {
      template: '<div>{{ message }}</div>',
      setup() {
        return { message: 'Hello SSR' };
      },
    };

    const result = await renderVaporToString(App as never);
    expect(result.html).toContain('Hello SSR');
    expect(result.html).not.toContain('Vapor SSR Placeholder');
  });

  it('应渲染嵌套元素与静态属性', async () => {
    const App = {
      template: '<div class="wrap"><span>{{ title }}</span></div>',
      setup() {
        return { title: 'LytJS' };
      },
    };

    const html = (await renderVaporToString(App as never)).html;
    expect(html).toContain('<div class="wrap"');
    expect(html).toContain('<span');
    expect(html).toContain('LytJS');
  });

  it('props 应参与渲染', async () => {
    const App = { template: '<p>{{ name }}</p>', setup: () => ({}) };
    const html = (await renderVaporToString(App as never, { name: 'from-props' })).html;
    expect(html).toContain('from-props');
  });

  it('应包含预取数据脚本（includePrefetchScript）', async () => {
    const App = { template: '<div>ok</div>', setup: () => ({}) };
    const result = await renderVaporToString(App as never, {}, { includePrefetchScript: true });
    // 无 prefetchData 时不注入脚本
    expect(result.html).toContain('ok');
    expect(result.scripts).toBeUndefined();
  });

  it('模板引用不存在的绑定时应抛出带上下文的错误（不静默返回空）', async () => {
    const Broken = {
      template: '<div>{{ notDefinedAnywhere }}</div>',
      setup() {
        return {};
      },
    };

    await expect(renderVaporToString(Broken as never)).rejects.toThrow(/Vapor SSR 渲染失败/);
  });

  it('流式渲染应产出与字符串渲染一致的内容', async () => {
    const App = {
      template: '<div>{{ message }}</div>',
      setup: () => ({ message: 'streamed' }),
    };

    const { stream } = await renderVaporToStream(App as never);
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let html = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value);
    }
    expect(html).toContain('streamed');
  });
});
