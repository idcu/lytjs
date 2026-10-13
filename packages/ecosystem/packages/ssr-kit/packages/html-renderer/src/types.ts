/**
 * @lytjs/html-renderer 类型定义
 *
 * ## 2026-10-10 订正（P1-6）
 *
 * 此前 `template?: string` 只是「声明了但从不使用」，`head` 也被完全忽略
 * （`generateHead()` 直接 `return ''`）⇒ 配置项全是装饰。
 * 现在每个字段都有明确定义并真正生效，语义见下。
 */

export interface RendererConfig {
  /**
   * 整页 HTML 模板；用 `{{appHtml}}`（或 `<!--app-html-->`）占位应用 HTML，
   * `{{head}}` 占位 head 片段。
   *
   * 缺省时使用内置骨架 `<!DOCTYPE html><html><head>…</head><body>…</body></html>`。
   *
   * @example
   * ```ts
   * new HTMLRenderer({ template: '<!DOCTYPE html><html><head>{{head}}</head><body>{{appHtml}}</body></html>' })
   * ```
   */
  template?: string;

  /**
   * head 内容。键的语义：
   *
   * | 键 | 产出 |
   * |---|---|
   * | `title` | `<title>值</title>` |
   * | `charset` | `<meta charset="值">` |
   * | `meta:<name>` | `<meta name="<name>" content="值">` |
   * | `link:<rel>` | `<link rel="<rel>" href="值">` |
   * | 其它键 `k` | `<meta name="k" content="值">` |
   *
   * 值会被 HTML 转义（防止 SSR 注入）。
   */
  head?: Record<string, string>;

  /** `body` 标签上的属性，如 `{ class: 'app', 'data-theme': 'dark' }` */
  bodyAttrs?: Record<string, string>;
}

export interface RenderResult {
  /** 完整 HTML 文档 */
  html: string;
  /** 生成的 head 片段 */
  head: string;
  /** body 内的应用内容 */
  body: string;
}
