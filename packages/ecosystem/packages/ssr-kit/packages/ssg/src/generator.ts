/**
 * @lytjs/ssg —— 静态站点生成（SSG）
 *
 * ## 2026-10-10 修复（P1-6）
 *
 * 本包此前是**壳实现**：`SSGGenerator.generateRoute()` 直接返回
 * `{ route, outputPath: '', success: true }` —— **既不渲染、也不写盘**，
 * 却报告 `success: true`（比抛错更危险：使用者会以为产物已生成）。
 *
 * 与此同时，真实实现一直在 **`@lytjs/ssr` 的 `ssg.ts`**（真渲染 + 真写盘 +
 * sitemap + ISR 中间件），而本包的 `package.json` **早已声明依赖 `@lytjs/ssr` 却完全没用它**。
 *
 * ⇒ 现在本包收敛为对真实实现的**薄封装 + 再导出**：删掉自造的那套假实现，
 *   消除与 `@lytjs/ssr` 的双实现。
 */

import type { SSGPage, SSGOptions } from '@lytjs/ssr';
import { generateStaticPages, writeStaticFiles } from '@lytjs/ssr';

// 再导出真实实现（含 sitemap / ISR）
export {
  writeStaticFiles,
  generateStaticPages,
  generateRouteManifest,
  validatePages,
  createISRMiddleware,
  revalidateOnDemand,
  getISRCacheStats,
  clearISRCache,
} from '@lytjs/ssr';
export type { SSGPage, SSGOptions } from '@lytjs/ssr';

export interface SSGConfig {
  /** 待生成的页面（每页含已构建好的 VNode 组件） */
  pages: SSGPage[];
  /** 生成选项：输出目录 / baseUrl / sitemap / ISR 等 */
  options?: SSGOptions;
}

export interface SSGResult {
  /** 相对输出目录的文件路径，如 `about/index.html` */
  filePath: string;
  /** 页面完整 HTML */
  html: string;
}

/**
 * SSG 生成器（对 `@lytjs/ssr` 真实实现的薄封装）。
 */
export class SSGGenerator {
  constructor(private config: SSGConfig) {}

  /**
   * 生成静态页面 HTML（**真正渲染**）。
   *
   * 只计算、不写盘 —— 便于测试，或由调用方自行决定落盘策略（如上传到 CDN）。
   * 需要直接写盘请用 {@link SSGGenerator.write}。
   */
  generate(): SSGResult[] {
    const files = generateStaticPages(this.config.pages, this.config.options);
    return [...files].map(([filePath, html]) => ({ filePath, html }));
  }

  /**
   * 生成并**写盘**（含 sitemap，若选项开启）。
   */
  async write(): Promise<void> {
    await writeStaticFiles(this.config.pages, this.config.options);
  }
}
