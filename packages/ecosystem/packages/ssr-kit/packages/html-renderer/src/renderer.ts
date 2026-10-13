/**
 * @lytjs/html-renderer —— 把已渲染好的应用 HTML 拼装成完整 HTML 文档
 *
 * ## 2026-10-10 修复（P1-6）
 *
 * 此前是**壳实现**：`generateHead()` 直接 `return ''`，构造参数 `_config`
 * 被**完全忽略**（连参数名都带下划线）⇒ `template` / `head` / `bodyAttrs`
 * 三个配置项全是装饰，调用方设了也不生效。
 *
 * 现在三者都真正生效，且**所有注入值都做 HTML 转义**
 * （报告 §7.5 记录了 `renderMetaTags` / `head` 的未转义注入问题，此处一并堵住）。
 */
import type { RendererConfig, RenderResult } from './types';

/** HTML 文本节点转义 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** HTML 属性值转义 */
function escapeAttr(value: string): string {
  return escapeHtml(value);
}

export class HTMLRenderer {
  private readonly config: RendererConfig;

  constructor(config: RendererConfig = {}) {
    if (config.template !== undefined && typeof config.template !== 'string') {
      // 快速失败：此前传函数/对象会被静默忽略，使用者以为模板生效了
      throw new TypeError(
        '[lytjs/html-renderer] `template` 必须是字符串（用 `{{appHtml}}` 占位应用 HTML），' +
          `实际收到 ${typeof config.template}。`,
      );
    }
    this.config = config;
  }

  render(appHtml: string): RenderResult {
    const head = this.generateHead();
    const body = this.generateBody(appHtml);
    const html = this.generateHTML(head, body);

    return {
      html,
      head,
      body,
    };
  }

  /**
   * 由 `config.head` 生成 head 片段。键的语义见 {@link RendererConfig.head}。
   */
  private generateHead(): string {
    const head = this.config.head ?? {};
    const parts: string[] = [];

    for (const [key, value] of Object.entries(head)) {
      if (key === 'title') {
        parts.push(`<title>${escapeHtml(value)}</title>`);
      } else if (key === 'charset') {
        parts.push(`<meta charset="${escapeAttr(value)}">`);
      } else if (key.startsWith('meta:')) {
        parts.push(`<meta name="${escapeAttr(key.slice(5))}" content="${escapeAttr(value)}">`);
      } else if (key.startsWith('link:')) {
        parts.push(`<link rel="${escapeAttr(key.slice(5))}" href="${escapeAttr(value)}">`);
      } else {
        parts.push(`<meta name="${escapeAttr(key)}" content="${escapeAttr(value)}">`);
      }
    }

    return parts.join('\n');
  }

  private generateBody(appHtml: string): string {
    return appHtml;
  }

  private generateHTML(head: string, body: string): string {
    const template = this.config.template;
    if (template !== undefined) {
      // ⚠️ 不用 `String.prototype.replaceAll`（ES2021）：本仓 tsconfig 基座是 ES2020
      // （`lib: ["ES2020", ...]`）⇒ 直接报 TS2550。改用等价的 split/join，
      // 且天然规避替换串里 `$&` / `$1` 被当作模式解释的问题。
      return template
        .split('{{head}}')
        .join(head)
        .split('{{appHtml}}')
        .join(body)
        .split('<!--app-html-->')
        .join(body);
    }

    const attrStr = Object.entries(this.config.bodyAttrs ?? {})
      .map(([key, value]) => ` ${key}="${escapeAttr(value)}"`)
      .join('');

    return `<!DOCTYPE html>
<html>
<head>${head}</head>
<body${attrStr}>${body}</body>
</html>`;
  }
}
