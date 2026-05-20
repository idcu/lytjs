import type { RendererConfig, RenderResult } from './types';

export class HTMLRenderer {
  constructor(private config: RendererConfig = {}) {}

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
