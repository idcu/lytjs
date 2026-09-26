/**
 * ⚠️ 实现状态（2026-09-26 审计）：**壳实现，不产生任何文件**
 *
 * `generateRoute()` 直接返回 `{ route, outputPath: '', success: true }` ——
 * **既不渲染模板、也不写盘**，却报告 `success: true`（比"报错"更危险：使用者会以为产物已生成）。
 *
 * 真实的 SSG 实现在 **`@lytjs/ssr` 的 `ssg.ts`**：真写文件 + sitemap + ISR 缓存 + 中间件。
 * ⇒ 本包与 `@lytjs/ssr` 内实现**重复且更弱**，对外承诺前应二选一
 *   （建议保留 `@lytjs/ssr` 中的实现，本包删除或明确标注为废弃）。
 */
import type { SSGConfig, SSGResult } from './types';

export class SSGGenerator {
  constructor(private config: SSGConfig) {}

  async generate(): Promise<SSGResult[]> {
    const results: SSGResult[] = [];

    for (const route of this.config.routes) {
      results.push(await this.generateRoute(route));
    }

    return results;
  }

  private async generateRoute(route: string): Promise<SSGResult> {
    return {
      route,
      outputPath: '',
      success: true,
    };
  }
}
