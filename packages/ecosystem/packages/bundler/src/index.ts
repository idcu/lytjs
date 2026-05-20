/* eslint-disable no-console */
/**
 * @lytjs/bundler - LytJS 构建工具集成
 *
 * 提供 Vite 和 Webpack 的基础集成
 */

import type { LytPluginOptions, LytPluginConfig, BundlerPreset } from './types';

/**
 * 创建 Vite 插件
 *
 * @param options - 插件选项
 * @returns Vite 插件
 */
export function createVitePlugin(_options: LytPluginOptions = {}): Record<string, unknown> {
  return {
    name: 'lytjs',
    configResolved(_config: Record<string, unknown>) {
      console.log('[lytjs] Vite plugin resolved');
    },
    transform(code: string, id: string) {
      if (id.endsWith('.lyt') || id.endsWith('.vue')) {
        console.log('[lytjs] Transforming', id);
      }
      return null;
    },
    configureServer(_server: Record<string, unknown>) {
      console.log('[lytjs] Dev server configured');
    },
  };
}

/**
 * 创建 Webpack 插件
 *
 * @param options - 插件选项
 * @returns Webpack 插件
 */
export function createWebpackPlugin(_options: LytPluginOptions = {}): Record<string, unknown> {
  return {
    name: 'lytjs',
    apply(compiler: Record<string, unknown>) {
      const hooks = compiler.hooks as Record<string, { tap: (name: string, callback: () => void) => void }>;
      hooks.beforeCompile.tap('LytPlugin', () => {
        console.log('[lytjs] Webpack plugin applied');
      });
    },
  };
}

/**
 * 获取默认预设配置
 *
 * @param name - 预设名称
 * @returns 预设配置
 */
export function getPreset(name: string = 'default'): BundlerPreset {
  const presets: Record<string, BundlerPreset> = {
    default: {
      name: 'default',
      vite: {
        plugins: [createVitePlugin()],
      },
    },
    ssg: {
      name: 'ssg',
      vite: {
        plugins: [createVitePlugin({ ssg: true })],
      },
    },
    ssr: {
      name: 'ssr',
      vite: {
        plugins: [createVitePlugin({ ssr: true })],
      },
    },
  };

  return presets[name] || presets.default;
}

/**
 * 创建完整的 Vite 配置
 *
 * @param options - 插件选项
 * @returns Vite 配置
 */
export function createViteConfig(options: LytPluginOptions = {}): Record<string, unknown> {
  const preset = getPreset(options.ssg ? 'ssg' : options.ssr ? 'ssr' : 'default');
  return {
    ...preset.vite,
  };
}

export type { LytPluginOptions, LytPluginConfig, BundlerPreset };
