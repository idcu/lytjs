/**
 * ⚠️ 实现状态（2026-09-26 审计）：**壳实现**
 *
 * - `generateHead()` 直接 `return ''`；
 * - 构造参数 `_config`（`RendererConfig`）被**完全忽略**。
 *
 * ⇒ 本类目前只能把 `appHtml` 套进一个固定骨架，**无法注入 title / meta / link 等 head 内容**。
 *
 * 真实的 SSR HTML 拼装在 **`@lytjs/ssr`**（`renderToString` / `renderToHtml`）。
 * 对外承诺前需补齐 head 生成，或直接删除本包以消除与 `@lytjs/ssr` 的**双实现**。
 */
import type { RendererConfig, RenderResult } from './types';

export class HTMLRenderer {
  constructor(_config: RendererConfig = {}) {}

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

  private generateHead(): string {
    return '';
  }

  private generateBody(appHtml: string): string {
    return appHtml;
  }

  private generateHTML(head: string, body: string): string {
    return `<!DOCTYPE html>
<html>
<head>${head}</head>
<body>${body}</body>
</html>`;
  }
}
