/**
 * LytX - Lyt.js 元框架类型定义
 *
 * 定义 LytX 的所有公共类型接口。
 */

// ================================================================
//  配置类型
// ================================================================

/** 站点元数据 */
export interface SiteConfig {
  title?: string
  description?: string
  lang?: string
}

/** 构建选项 */
export interface BuildConfig {
  inlineStyles?: boolean   // default: false
  minify?: boolean         // default: true
}

/** 中间件配置 */
export interface MiddlewareConfig {
  /** 全局中间件列表 */
  global?: string[]
  /** 路径特定中间件映射 */
  [pathPattern: string]: string[] | undefined
}

/** LytX 主配置接口 */
export interface LytXConfig {
  /** 应用基础路径 */
  base?: string
  /** 页面目录 */
  pagesDir?: string
  /** 布局目录 */
  layoutsDir?: string
  /** 输出目录 */
  outDir?: string
  /** API 路由目录 */
  apiDir?: string
  /** 站点元数据 */
  site?: SiteConfig
  /** 渲染模式 */
  mode?: 'ssr' | 'ssg' | 'spa'
  /** 构建选项 */
  build?: BuildConfig
  /** 中间件配置 */
  middleware?: MiddlewareConfig
}

/** 合并后的完整配置（所有字段已填充默认值） */
export interface ResolvedLytXConfig {
  base: string
  pagesDir: string
  layoutsDir: string
  outDir: string
  apiDir: string
  site: Required<SiteConfig>
  mode: 'ssr' | 'ssg' | 'spa'
  build: Required<BuildConfig>
  middleware: MiddlewareConfig
}

// ================================================================
//  路由类型
// ================================================================

/** 路由定义 */
export interface Route {
  /** 路由路径（如 '/'、'/about'、'/blog/:slug'） */
  path: string
  /** 页面文件路径 */
  filePath: string
  /** 动态参数名列表 */
  params?: string[]
  /** 是否为 catch-all 路由 */
  isCatchAll?: boolean
  /** 是否为首页 */
  isIndex?: boolean
  /** 是否为 404 页面 */
  is404?: boolean
}

/** 路由匹配结果 */
export interface RouteMatch {
  route: Route
  params: Record<string, string>
}

// ================================================================
//  页面模块类型
// ================================================================

/** Head 配置 */
export interface HeadConfig {
  title?: string
  meta?: Array<{ name?: string; content?: string; property?: string; charset?: string }>
  link?: Array<{ rel?: string; href?: string; type?: string }>
  style?: Array<{ textContent?: string; cssText?: string }>
}

/** 页面组件选项 */
export interface ComponentOptions {
  name?: string
  setup?: (...args: any[]) => any
  render?: (...args: any[]) => any
  props?: Record<string, any>
  slots?: Record<string, any>
  [key: string]: any
}

/** 页面模块 */
export interface PageModule {
  default: ComponentOptions
  layout?: string
  title?: string
  description?: string
  head?: () => HeadConfig
  loader?: () => Promise<any>
}

// ================================================================
//  布局类型
// ================================================================

/** 布局模块 */
export interface LayoutModule {
  default: ComponentOptions
}

// ================================================================
//  渲染类型
// ================================================================

/** 渲染上下文 */
export interface RenderContext {
  route: Route
  params: Record<string, string>
  config: ResolvedLytXConfig
  pageModule?: PageModule
  layoutModule?: LayoutModule
}

/** SSG 构建结果 */
export interface SSGPage {
  path: string
  html: string
}

/** SPA 清单条目 */
export interface SPAManifestEntry {
  path: string
  filePath: string
  params?: string[]
}

/** SPA 清单 */
export interface SPAManifest {
  routes: SPAManifestEntry[]
  base: string
}

// ================================================================
//  CLI 类型
// ================================================================

/** CLI 命令类型 */
export type CLICommand = 'dev' | 'build' | 'preview' | 'migrate'

/** 解析后的 CLI 参数 */
export interface ParsedCLIArgs {
  command: CLICommand
  rootDir: string
  port?: number
  host?: string
  /** 构建模式：spa（默认）、ssr、ssg */
  mode?: 'spa' | 'ssr' | 'ssg'
}
