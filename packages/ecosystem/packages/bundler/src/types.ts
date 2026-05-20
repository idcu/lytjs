/**
 * @lytjs/bundler - Type definitions
 */

export interface LytPluginOptions {
  /** 是否启用 SSG */
  ssg?: boolean;
  /** SSG 页面路径 */
  ssgPages?: string[];
  /** 是否启用 SSR */
  ssr?: boolean;
}

export interface LytPluginConfig {
  /** Vite 插件配置 */
  vite?: Record<string, unknown>;
  /** Webpack 插件配置 */
  webpack?: Record<string, unknown>;
}

export interface BundlerPreset {
  /** 预设名称 */
  name: string;
  /** Vite 配置 */
  vite?: Record<string, unknown>;
  /** Webpack 配置 */
  webpack?: Record<string, unknown>;
}
