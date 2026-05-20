export interface RendererConfig {
  template?: string;
  head?: Record<string, string>;
  bodyAttrs?: Record<string, string>;
}

export interface RenderResult {
  html: string;
  head: string;
  body: string;
}
