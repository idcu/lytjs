/**
 * @lytjs/bundler - Type definitions
 *
 * ⚠️ 2026-10-10 订正（P1-8）：本文件此前声明了 `LytPluginConfig.webpack` 与
 * `BundlerPreset.webpack`，但 Webpack 通路**从未实现**（`createWebpackPlugin()`
 * 只在 `beforeCompile` 里打印一次告警、不做任何转换）—— 属于「声明了能力却
 * 没有实现」。现已删除这两个字段与对应的 `createWebpackPlugin()`：
 * 需要 Webpack 的用户请用本包导出的 `transformSFC()` 自行写一个 loader
 * （约 5 行，见 README）。
 */

/** 传给 `createVitePlugin()` 的转换选项 */
export interface LytPluginOptions {
  /**
   * 是否按 SSR 目标编译模板。
   *
   * 该开关会流入 `@lytjs/compiler` 的 `ssrMode`，使模板产出
   * `renderToString(...)` + HTML 转义（而非 `createBlock(...)`）。
   * 默认 `false`（CSR）。
   */
  ssr?: boolean;
  /**
   * 是否对所有 `<style>` 块强制作用域化。
   *
   * - `true`  → 所有 style 块都加 `[data-v-<id>]`
   * - `false` → 所有 style 块都不加
   * - 不传（默认）→ **按各 style 块自身的 `scoped` 属性决定**
   */
  scoped?: boolean;
  /** 渲染模式，默认 `'vnode'`。透传给 `@lytjs/compiler`。 */
  rendererMode?: 'vnode' | 'signal' | 'vapor';
  /** 需要拦截的文件扩展名，默认 `['.lyt', '.vue']` */
  extensions?: readonly string[];
  /**
   * 是否在产出的 JS 末尾追加**运行时 style 注入**片段（默认 `true`）。
   *
   * ⚠️ 已知限制：本包不做 CSS 抽取，样式由运行时注入 `<style>` 标签。
   * 需要构建期 CSS 抽取 / HMR 样式热更请改用 `@lytjs/plugin-vite`
   * （已迁出至独立仓库）。设为 `false` 时 `transformSFC()` 只在返回值里
   * 给出 `css` 字段，由调用方自行处理。
   */
  injectCss?: boolean;
}

/** 传给 `createViteConfig()` 的选项：转换选项 + 预设选择 */
export interface LytConfigOptions extends LytPluginOptions {
  /** 选择 SSG 预设（等价于同时开启 `ssr`，因为 SSG 走 SSR 预渲染） */
  ssg?: boolean;
}

/** 构建预设 */
export interface BundlerPreset {
  /** 预设名称 */
  name: string;
  /** Vite 配置 */
  vite?: Record<string, unknown>;
}

/** `transformSFC()` 的返回值（对齐 Vite 的 `transform` 钩子契约） */
export interface LytTransformResult {
  /** 转换后的 JS 模块源码 */
  code: string;
  /** sourcemap；当前编译器未产出，恒为 `null` */
  map: object | null;
  /** 从 `<style>` 块抽取出的 CSS（无 style 块时为 `undefined`） */
  css?: string;
  /** 实际生效的 scope id（无作用域样式时为 `undefined`） */
  scopedId?: string;
}
