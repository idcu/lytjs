// @vitest-environment jsdom
/**
 * Message 组件 XSS 防护测试
 *
 * 验证 `message` 作为调用方传入的任意字符串，在注入 innerHTML 前经 escapeHTML 转义，
 * 不会被浏览器解析为真实 DOM / 执行脚本；并对 `type` 在 class 上下文的注入做纵深防御。
 *
 * 硬约束 #9 视角：本测试即「翻转保护 ⇒ 变红」的产物级断言——
 * 若移除 Message.ts 中的 escapeHTML(message) / escapeHTML(type)，
 * 下方「载荷被中和」「注入无法跳出 class 属性」两条断言将立即失败（红）。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { Message } from './Message';

afterEach(() => {
  // 清理所有 Message 注入的 DOM，避免用例间串扰
  document.querySelectorAll('.lyt-message-container').forEach((el) => el.remove());
});

describe('Message 组件 - XSS 防护', () => {
  it('普通文本 message 作为纯文本渲染', () => {
    Message.success('操作成功');
    const content = document.querySelector('.lyt-message__content')!;
    expect(content.textContent).toBe('操作成功');
  });

  it('message 中的 HTML 载荷被转义，不会生成真实 DOM 元素', () => {
    const payload = '<img src=x onerror=alert(1)>';
    Message.error(payload);
    const content = document.querySelector('.lyt-message__content')!;
    // 文本节点保留原始字符串（未被吞掉）
    expect(content.textContent).toBe(payload);
    // 关键：载荷未被解析为真实 <img> 元素（否则 onerror 会被执行）
    expect(content.querySelector('img')).toBeNull();
    // 序列化后应包含转义实体
    expect(content.innerHTML).toContain('&lt;img');
  });

  it('script 载荷同样被中和', () => {
    const payload = '<script>alert(1)</script>';
    Message.warning(payload);
    const content = document.querySelector('.lyt-message__content')!;
    expect(content.textContent).toBe(payload);
    expect(content.querySelector('script')).toBeNull();
  });

  it('type 注入无法跳出 class 属性（纵深防御）', () => {
    // 模拟调用方绕过类型约束传入恶意 type
    Message.info('hi', { type: 'info" data-injected="x' as unknown as 'info' });
    const el = document.querySelector('.lyt-message')!;
    // 注入的 data-injected 不应成为真实 HTML 属性
    expect(el.hasAttribute('data-injected')).toBe(false);
    // 类名前缀仍正确保留
    expect(el.className).toContain('lyt-message--info');
  });

  it('showClose 时渲染关闭按钮', () => {
    Message.success('可关闭', { showClose: true });
    expect(document.querySelector('.lyt-message__close')).not.toBeNull();
  });
});
