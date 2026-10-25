/**
 * 行为级判据：`@lytjs/renderer` 的 **OptimizedSSRStream**（`src/ssr/ssr-stream-optimized.ts`）
 *
 * ## 为什么要有这条
 *
 * 这是流式 SSR 的出口：缓冲、冲刷、统计、预加载提示都在这里。判错的表现不是崩，
 * 而是**首字节晚到**（缓冲没及时冲刷）或**监控数字全错**（字节数按字符算）。
 *
 * ## 空档里的两处缺陷
 *
 * 1. `stats.totalBytes` 累加的是 `chunk.length`（**字符数**），而 `flush()` 编码后写入的是
 *    UTF-8 字节 —— 中文 1 字符 = 3 字节 ⇒ 统计值只有真实值的三分之一，带宽核算/告警全错。
 * 2. `http2Push` / `deferThreshold` / `compression` 三个公开选项**声明了、给了默认值、从未读取**
 *    ⇒ 调用方以为开了压缩或 HTTP/2 Push，实际什么都没发生。已删除（同 `treeShaking` 的处理）。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OptimizedSSRStream } from '../src/ssr/ssr-stream-optimized';

function makeStream(options: Record<string, unknown> = {}) {
  const enqueue = vi.fn();
  const controller = { enqueue } as unknown as Parameters<typeof OptimizedSSRStream>[0];
  const stream = new OptimizedSSRStream(controller as never, options);
  return { stream, enqueue };
}

const decoded = (call: unknown[]) => new TextDecoder().decode(call[0] as Uint8Array);

beforeEach(() => {
  vi.restoreAllMocks();
});

// ==================== 缓冲与冲刷 ====================

describe('push / flush', () => {
  it('未达阈值不冲刷（缓冲住，攒够再一次写）', () => {
    const { stream, enqueue } = makeStream({ bufferSize: 100 });

    stream.push('abc');

    expect(enqueue).not.toHaveBeenCalled();
  });

  it('达到 bufferSize 自动冲刷，且内容按 push 顺序拼接', () => {
    const { stream, enqueue } = makeStream({ bufferSize: 10 });

    stream.push('12345');
    stream.push('67890');

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(decoded(enqueue.mock.calls[0]!)).toBe('1234567890');
  });

  it('手动 flush 会把不足阈值的内容也写出去', () => {
    const { stream, enqueue } = makeStream({ bufferSize: 1000 });
    stream.push('tail');

    stream.flush();

    expect(decoded(enqueue.mock.calls[0]!)).toBe('tail');
  });

  it('空缓冲 flush 是 no-op（不写空块、不计块数）', () => {
    const { stream, enqueue } = makeStream();

    stream.flush();
    stream.flush();

    expect(enqueue).not.toHaveBeenCalled();
    expect(stream.getStats().chunkCount).toBe(0);
  });

  it('冲刷后缓冲清空，下一块从零开始', () => {
    const { stream, enqueue } = makeStream({ bufferSize: 5 });

    stream.push('aaaaa');
    stream.push('bbbbb');

    expect(enqueue).toHaveBeenCalledTimes(2);
    expect(decoded(enqueue.mock.calls[1]!)).toBe('bbbbb');
  });
});

// ==================== 统计 ====================

describe('统计', () => {
  it('chunkCount 计的是冲刷次数', () => {
    const { stream } = makeStream({ bufferSize: 4 });

    stream.push('aaaa');
    stream.push('bbbb');

    expect(stream.getStats().chunkCount).toBe(2);
  });

  it('★ totalBytes 必须是**编码后的字节数**，不是字符数（中文 1 字符 = 3 字节）', () => {
    const { stream } = makeStream({ bufferSize: 1000 });

    stream.push('中文'); // 2 字符 ⇒ 6 字节
    stream.flush();

    expect(stream.getStats().totalBytes).toBe(6);
  });

  it('★ ASCII 下字节数等于字符数（回归保护）', () => {
    const { stream } = makeStream({ bufferSize: 1000 });

    stream.push('abc');
    stream.flush();

    expect(stream.getStats().totalBytes).toBe(3);
  });

  it('ttfb 只在首块记录一次', () => {
    const { stream } = makeStream({ bufferSize: 2 });

    stream.push('aa');
    const first = stream.getStats().ttfb;
    stream.push('bb');

    expect(first).toBeGreaterThanOrEqual(0);
    expect(stream.getStats().ttfb).toBe(first);
  });
});

// ==================== 预加载提示 ====================

describe('addPreloadHint', () => {
  it('同一资源只提示一次（type + href 去重）', () => {
    const { stream, enqueue } = makeStream({ bufferSize: 1 });

    stream.addPreloadHint({ type: 'script', href: '/a.js' });
    stream.addPreloadHint({ type: 'script', href: '/a.js' });

    const html = enqueue.mock.calls.map((c) => decoded(c)).join('');
    expect(html.match(/\/a\.js/g)?.length).toBe(1);
  });

  it('同 href 不同 type 视为不同资源', () => {
    const { stream, enqueue } = makeStream({ bufferSize: 1 });

    stream.addPreloadHint({ type: 'script', href: '/x' });
    stream.addPreloadHint({ type: 'style', href: '/x' });

    const html = enqueue.mock.calls.map((c) => decoded(c)).join('');
    expect(html.match(/\/x/g)?.length).toBe(2);
  });

  it('crossorigin / importance 会带进 Link 头', () => {
    const { stream, enqueue } = makeStream({ bufferSize: 1 });

    stream.addPreloadHint({
      type: 'font',
      href: '/f.woff2',
      crossorigin: true,
      importance: 'high',
    });

    const html = decoded(enqueue.mock.calls[0]!);
    expect(html).toContain('rel="preload"');
    expect(html).toContain('as="font"');
    expect(html).toContain('crossorigin');
    expect(html).toContain('importance="high"');
  });
});

// ==================== 文档头尾 ====================

describe('generateDocumentHead / Footer', () => {
  it('title 与 meta / link 的值都会被转义', () => {
    const { stream } = makeStream();

    const head = stream.generateDocumentHead({
      title: '<script>x</script>',
      meta: [{ name: 'a"b', content: '<i>' }],
      links: [{ rel: 'stylesheet', href: '/a.css?x=1&y=2' }],
    });

    expect(head).not.toContain('<script>x</script>');
    expect(head).toContain('&lt;script&gt;');
    expect(head).toContain('&quot;');
    expect(head).toContain('&amp;');
  });

  it('criticalCSS 内联进 head', () => {
    const { stream } = makeStream({ criticalCSS: '.a{color:red}' });

    expect(stream.generateDocumentHead({})).toContain('<style>.a{color:red}</style>');
  });

  it('无 criticalCSS 时不产出空 style 标签', () => {
    const { stream } = makeStream();

    expect(stream.generateDocumentHead({})).not.toContain('<style>');
  });

  it('footer：内联脚本在前、外链脚本在后，src 被转义', () => {
    const { stream } = makeStream();

    const footer = stream.generateDocumentFooter({
      inlineScripts: ['console.log(1)'],
      scripts: ['/a.js?x=1&y=2'],
    });

    expect(footer.indexOf('console.log(1)')).toBeLessThan(footer.indexOf('/a.js'));
    expect(footer).toContain('&amp;');
  });
});
