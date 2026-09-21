/**
 * @lytjs/bundler - LytJS 构建工具集成
 *
 * ⚠️ 实现状态（2026-09 审计）：本包目前是**插件骨架**，没有真实的编译行为 ——
 * `transform()` 对 .lyt/.vue 文件不做任何转换，只返回 null（不产出也不报错）。
 * 由于静默返回 null 会让使用者误以为"插件已生效但没效果"，这里改为在 DEV 下
 * 输出一次性告警说明未实现。真实实现可复用 `@lytjs/compiler` 的 SFC 编译能力
 * （参见 packages/plugins/packages/plugin-vite 的做法）。
 */

import type { LytPluginOptions, LytPluginConfig, BundlerPreset } from './types';

/**
 * 一次性告警：编译器集成尚未实现
 */
let warnedUnimplemented = false;
function warnTransformUnimplemented(target: string): void {
  if (warnedUnimplemented) return;
  warnedUnimplemented = true;
  if (typeof console !== 'undefined') {
    console.warn(
      `[lytjs/bundler] 编译集成尚未实现：${target} 的 .lyt/.vue 文件不会被转换。` +
        '如需可用的 Vite 集成，请使用 @lytjs/plugin-vite。',
    );
  }
}

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
        warnTransformUnimplemented(id);
      }
      return null;
    },
    configureServer(_server: Record<string, unknown>) {
      // 无真实配置动作（保留钩子以便后续扩展）
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
      const hooks = compiler.hooks as Record<
        string,
        { tap: (name: string, callback: () => void) => void }
      >;
      hooks.beforeCompile.tap('LytPlugin', () => {
        warnTransformUnimplemented('webpack');
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
