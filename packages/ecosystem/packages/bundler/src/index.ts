/**
 * @lytjs/bundler - LytJS 构建工具集成
 *
 * ⚠️ 实现状态（2026-10-10 订正，P1-8）：
 *
 * 此前本包是**插件骨架** —— `transform()` 对 `.lyt/.vue` 只 `return null`（不转换、
 * 不报错），仅打印一次「尚未实现」告警；`createWebpackPlugin()` 更是只在
 * `beforeCompile` 里打印告警、完全不做转换。即：使用者按 README 接入后
 * **什么都不会发生**，而包名/描述却宣称提供构建集成。
 *
 * 现在 `transformSFC()` 是**真实实现**，委托 `@lytjs/compiler` 的 SFC 编译能力
 * （`parseSFC` + `compileSFC`），`createVitePlugin()` 真的转换 `.lyt/.vue`。
 * Webpack 通路（假的 `createWebpackPlugin`）已**删除**，不再提供虚假 API。
 */

import { parseSFC, compileSFC } from '@lytjs/compiler/sfc';
import type {
  LytPluginOptions,
  LytConfigOptions,
  BundlerPreset,
  LytTransformResult,
} from './types';

/** 默认拦截的扩展名 */
export const LYT_EXTENSIONS = ['.lyt', '.vue'] as const;

/** 去掉 Vite 查询串（`?raw` / `?t=123` 等） */
function stripQuery(id: string): string {
  const q = id.indexOf('?');
  return q === -1 ? id : id.slice(0, q);
}

/**
 * 判断某个模块 id 是否需要由本包转换。
 *
 * @param id - 模块 id（可带查询串）
 * @param extensions - 需要拦截的扩展名
 */
export function isLytModule(id: string, extensions: readonly string[] = LYT_EXTENSIONS): boolean {
  const clean = stripQuery(id);
  return extensions.some((ext) => clean.endsWith(ext));
}

/** 由模块 id 生成稳定的短哈希（用于 `<style>` 元素的 id，避免重复注入） */
function stableId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * 生成运行时 style 注入片段（SSR 安全：无 `document` 时整体跳过）。
 */
function buildCssInjection(id: string, css: string): string {
  const styleId = `lytjs-style-${stableId(id)}`;
  return [
    '',
    `/* @lytjs/bundler: scoped CSS for ${id} (runtime injection) */`,
    `if (typeof document !== 'undefined') {`,
    `  var __lyt_style_id = ${JSON.stringify(styleId)};`,
    `  var __lyt_style = document.getElementById(__lyt_style_id);`,
    `  if (!__lyt_style) {`,
    `    __lyt_style = document.createElement('style');`,
    `    __lyt_style.id = __lyt_style_id;`,
    `    __lyt_style.setAttribute('data-lytjs', '');`,
    `    document.head.appendChild(__lyt_style);`,
    `  }`,
    `  __lyt_style.textContent = ${JSON.stringify(css)};`,
    `}`,
    '',
  ].join('\n');
}

/**
 * 把 `.lyt` / `.vue` 源码编译为 JS 模块。
 *
 * 这是本包的核心能力，也是 Vite 插件 `transform` 钩子的实现体；
 * 需要 Webpack / Rspack 等其它构建工具时可直接调用本函数写一个 loader。
 *
 * @param code - 原始源码
 * @param id - 模块 id（通常是绝对路径，可带查询串）
 * @param options - 转换选项
 * @returns 转换结果；`id` 不属于 `extensions` 时返回 `null`（表示「不处理」）
 */
export function transformSFC(
  code: string,
  id: string,
  options: LytPluginOptions = {},
): LytTransformResult | null {
  const {
    extensions = LYT_EXTENSIONS,
    injectCss = true,
    ssr = false,
    scoped,
    rendererMode,
  } = options;

  if (!isLytModule(id, extensions)) return null;

  const filename = stripQuery(id);
  const descriptor = parseSFC(code, { filename });
  const result = compileSFC(descriptor, { filename, scoped, ssr, rendererMode });

  let out = result.code;
  if (injectCss && result.css) {
    out += buildCssInjection(filename, result.css);
  }

  const transformed: LytTransformResult = {
    code: out,
    map: (result.sourceMap as object | undefined) ?? null,
  };
  if (result.css !== undefined) transformed.css = result.css;
  if (result.scopedId !== undefined) transformed.scopedId = result.scopedId;
  return transformed;
}

/**
 * 创建 Vite 插件。
 *
 * 该插件对 `.lyt` / `.vue` 模块调用 `transformSFC()`，产出可被 JS 引擎直接执行的
 * 模块源码（render 函数 + 运行时 style 注入）。非 `.lyt` / `.vue` 模块返回 `null`，
 * 交由其它插件处理。
 *
 * @param options - 转换选项
 * @returns Vite 插件对象
 */
export function createVitePlugin(options: LytPluginOptions = {}): Record<string, unknown> {
  return {
    name: 'lytjs',
    enforce: 'pre',
    transform(code: string, id: string) {
      const result = transformSFC(code, id, options);
      if (!result) return null;
      return { code: result.code, map: result.map };
    },
  };
}

/**
 * 获取预设配置。
 *
 * @param name - 预设名称（`default` / `ssg` / `ssr`）
 * @returns 预设配置；未知名称回退到 `default`
 */
export function getPreset(name: string = 'default'): BundlerPreset {
  const presets: Record<string, BundlerPreset> = {
    default: {
      name: 'default',
      vite: { plugins: [createVitePlugin()] },
    },
    // SSG 走 SSR 预渲染 ⇒ 模板必须按 SSR 目标编译
    ssg: {
      name: 'ssg',
      vite: { plugins: [createVitePlugin({ ssr: true })] },
    },
    ssr: {
      name: 'ssr',
      vite: { plugins: [createVitePlugin({ ssr: true })] },
    },
  };

  return presets[name] ?? presets.default!;
}

/**
 * 创建完整的 Vite 配置。
 *
 * ⚠️ 2026-10-10 订正（P1-8）：此前实现是 `{ ...getPreset(...).vite }` ——
 * 它返回的是**预设内部**用空 options 构造的插件，调用方传进来的
 * `rendererMode` / `scoped` / `injectCss` 等选项被**静默丢弃**。
 * 现在改为用调用方的 options 重新构造插件，选项真正生效。
 *
 * @param options - 转换选项 + 预设选择（`ssg`）
 * @returns Vite 配置对象
 */
export function createViteConfig(options: LytConfigOptions = {}): Record<string, unknown> {
  const preset = getPreset(options.ssg ? 'ssg' : options.ssr ? 'ssr' : 'default');
  // `ssg` 只是预设选择开关，不是编译器选项，故不向下传
  const pluginOptions: LytConfigOptions = { ...options };
  delete pluginOptions.ssg;
  // ssg 预设必须保持 ssr 编译（SSG = SSR 预渲染），除非调用方显式给了 ssr
  if (preset.name === 'ssg' && pluginOptions.ssr === undefined) {
    pluginOptions.ssr = true;
  }
  return {
    ...preset.vite,
    plugins: [createVitePlugin(pluginOptions)],
  };
}

export type { LytPluginOptions, LytConfigOptions, BundlerPreset, LytTransformResult };
