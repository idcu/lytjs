/**
 * LytX - 页面渲染器
 *
 * 支持 SSR（服务端渲染）、SSG（静态站点生成）和 SPA（单页应用）三种模式。
 *
 * SSR: 将页面渲染为 HTML 字符串，通过 HTTP 服务器实时响应
 * SSG: 预渲染所有页面为静态 HTML 文件
 * SPA: 生成 HTML shell 和路由清单
 *
 * 纯原生零依赖实现，使用 Node.js fs/path 模块。
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import type {
  Route,
  ResolvedLytXConfig,
  PageModule,
  LayoutModule,
  ComponentOptions,
  SSGPage,
  SPAManifest,
} from './types'
import { loadPage } from './loader'
import { resolveLayout, applyLayout } from './layout'

// ================================================================
//  HTML 生成工具
// ================================================================

/**
 * HTML 转义
 */
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * 生成完整的 HTML 文档
 *
 * @param title 页面标题
 * @param bodyContent 页面 body 内容
 * @param config 配置
 * @param description 页面描述
 * @returns 完整的 HTML 字符串
 */
function generateHTMLDocument(
  title: string,
  bodyContent: string,
  config: ResolvedLytXConfig,
  description?: string,
): string {
  const siteTitle = config.site.title
  const fullTitle = title ? `${title} - ${siteTitle}` : siteTitle
  const lang = config.site.lang
  const base = config.base

  const metaTags = [
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
  ]

  if (description) {
    metaTags.push(`<meta name="description" content="${escapeHTML(description)}" />`)
  }

  const baseTag = base !== '/' ? `<base href="${escapeHTML(base)}" />` : ''

  return `<!DOCTYPE html>
<html lang="${escapeHTML(lang)}">
<head>
  ${metaTags.join('\n  ')}
  ${baseTag}
  <title>${escapeHTML(fullTitle)}</title>
</head>
<body>
  ${bodyContent}
</body>
</html>`
}

/**
 * 简单的 VNode 到 HTML 字符串渲染
 *
 * 轻量级实现，用于 LytX 内部渲染。
 * 不依赖 @lytjs/renderer，保持独立性。
 *
 * @param vnode VNode 对象
 * @returns HTML 字符串
 */
function simpleRenderToString(vnode: any): string {
  if (vnode === null || vnode === undefined) {
    return ''
  }

  // 字符串或数字
  if (typeof vnode === 'string') {
    return escapeHTML(vnode)
  }
  if (typeof vnode === 'number') {
    return String(vnode)
  }

  // 数组
  if (Array.isArray(vnode)) {
    return vnode.map(simpleRenderToString).join('')
  }

  // Symbol 类型（Fragment 等）
  if (typeof vnode.type === 'symbol') {
    if (Array.isArray(vnode.children)) {
      return vnode.children.map(simpleRenderToString).join('')
    }
    return ''
  }

  // 函数类型（组件）
  if (typeof vnode.type === 'function') {
    const result = vnode.type(vnode.props || {}, {
      slots: vnode.children || {},
      emit: () => {},
    })
    return simpleRenderToString(result)
  }

  // 对象类型（组件）
  if (typeof vnode.type === 'object' && vnode.type !== null) {
    const component = vnode.type
    if (typeof component.render === 'function') {
      const result = component.render(vnode.props || {}, {
        slots: vnode.children || {},
        emit: () => {},
      })
      return simpleRenderToString(result)
    }
    return '<!---->'
  }

  // 字符串类型（HTML 元素）
  if (typeof vnode.type === 'string') {
    const tag = vnode.type
    const props = vnode.props || {}

    // 序列化属性
    const attrs: string[] = []
    for (const key in props) {
      if (key.startsWith('on') || key === 'key' || key === 'ref') continue
      const value = props[key]
      if (value === true) {
        attrs.push(key)
      } else if (value !== false && value !== null && value !== undefined) {
        attrs.push(`${key}="${escapeHTML(String(value))}"`)
      }
    }
    const propsStr = attrs.length > 0 ? ' ' + attrs.join(' ') : ''

    // 自闭合标签
    const voidTags = new Set([
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
      'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
    ])
    if (voidTags.has(tag)) {
      return `<${tag}${propsStr} />`
    }

    // 序列化子节点
    let childrenStr = ''
    if (vnode.children !== null && vnode.children !== undefined) {
      if (typeof vnode.children === 'string') {
        childrenStr = escapeHTML(vnode.children)
      } else if (Array.isArray(vnode.children)) {
        childrenStr = vnode.children.map(simpleRenderToString).join('')
      } else if (typeof vnode.children === 'object') {
        // 插槽对象
        for (const slotName in vnode.children) {
          const slotFn = vnode.children[slotName]
          if (typeof slotFn === 'function') {
            childrenStr += simpleRenderToString(slotFn())
          }
        }
      }
    }

    return `<${tag}${propsStr}>${childrenStr}</${tag}>`
  }

  return ''
}

// ================================================================
//  SSR 渲染
// ================================================================

/**
 * 渲染单个页面（SSR 模式）
 *
 * 加载页面模块和布局，渲染为完整的 HTML 字符串。
 *
 * @param route 路由信息
 * @param params 路由参数
 * @param config 配置
 * @param rootDir 项目根目录
 * @returns HTML 字符串
 */
export async function renderPage(
  route: Route,
  params: Record<string, string>,
  config: ResolvedLytXConfig,
  rootDir: string,
): Promise<string> {
  // 加载页面模块
  const pageFilePath = path.join(rootDir, config.pagesDir, route.filePath)
  let pageModule: PageModule

  try {
    pageModule = await loadPage(pageFilePath)
  } catch {
    // 页面加载失败，返回简单错误页面
    return generateHTMLDocument('404', '<h1>Page Not Found</h1>', config)
  }

  // 调用数据加载器
  if (pageModule.loader) {
    try {
      await pageModule.loader()
    } catch {
      // 数据加载失败不影响渲染
    }
  }

  // 解析布局
  const layoutsDir = path.join(rootDir, config.layoutsDir)
  const layoutModule = await resolveLayout(pageModule, layoutsDir, config.site.title)

  // 组合页面和布局
  const combinedComponent = applyLayout(pageModule, layoutModule)

  // 渲染为 VNode
  let vnode: any
  if (typeof combinedComponent.render === 'function') {
    vnode = combinedComponent.render({ params }, { slots: {}, emit: () => {} })
  } else {
    vnode = null
  }

  // 渲染为 HTML 字符串
  const bodyContent = simpleRenderToString(vnode)

  // 生成完整 HTML 文档
  const title = pageModule.title || ''
  const description = pageModule.description

  return generateHTMLDocument(title, bodyContent, config, description)
}

/**
 * 使用已加载的模块渲染页面（用于测试）
 *
 * @param pageModule 页面模块
 * @param layoutModule 布局模块
 * @param config 配置
 * @returns HTML 字符串
 */
export function renderPageWithModules(
  pageModule: PageModule,
  layoutModule: LayoutModule,
  config: ResolvedLytXConfig,
): string {
  const combinedComponent = applyLayout(pageModule, layoutModule)

  let vnode: any
  if (typeof combinedComponent.render === 'function') {
    vnode = combinedComponent.render({}, { slots: {}, emit: () => {} })
  } else {
    vnode = null
  }

  const bodyContent = simpleRenderToString(vnode)
  const title = pageModule.title || ''
  const description = pageModule.description

  return generateHTMLDocument(title, bodyContent, config, description)
}

// ================================================================
//  SSG 构建
// ================================================================

/**
 * 静态站点生成（SSG）
 *
 * 预渲染所有页面为静态 HTML 文件，输出到 outDir 目录。
 *
 * @param routes 路由列表
 * @param config 配置
 * @param rootDir 项目根目录
 * @returns 生成的页面列表
 */
export async function buildStatic(
  routes: Route[],
  config: ResolvedLytXConfig,
  rootDir: string,
): Promise<SSGPage[]> {
  const outDir = path.join(rootDir, config.outDir)
  const pages: SSGPage[] = []

  // 确保输出目录存在
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  for (const route of routes) {
    // 跳过 404 页面（SSG 中单独处理）
    if (route.is404) continue

    // 跳过动态路由（SSG 中需要预知所有参数值）
    if (route.params && route.params.length > 0) continue

    // 渲染页面
    const html = await renderPage(route, {}, config, rootDir)

    // 确定输出文件路径
    let outputPath: string
    if (route.path === '/') {
      outputPath = path.join(outDir, 'index.html')
    } else {
      outputPath = path.join(outDir, route.path, 'index.html')
    }

    // 确保输出目录存在
    const outputDirPath = path.dirname(outputPath)
    if (!fs.existsSync(outputDirPath)) {
      fs.mkdirSync(outputDirPath, { recursive: true })
    }

    // 写入文件
    fs.writeFileSync(outputPath, html, 'utf-8')
    pages.push({ path: route.path, html })
  }

  // 生成 404 页面
  const notFoundRoute = routes.find(r => r.is404)
  if (notFoundRoute) {
    const html = await renderPage(notFoundRoute, {}, config, rootDir)
    fs.writeFileSync(path.join(outDir, '404.html'), html, 'utf-8')
    pages.push({ path: '/404', html })
  }

  return pages
}

// ================================================================
//  SPA 构建
// ================================================================

/**
 * SPA 模式构建
 *
 * 生成 HTML shell 和路由清单文件。
 *
 * @param routes 路由列表
 * @param config 配置
 * @param rootDir 项目根目录
 * @returns SPA 清单
 */
export async function buildSPA(
  routes: Route[],
  config: ResolvedLytXConfig,
  rootDir: string,
): Promise<SPAManifest> {
  const outDir = path.join(rootDir, config.outDir)

  // 确保输出目录存在
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  // 生成路由清单
  const manifest: SPAManifest = {
    routes: routes.map(route => ({
      path: route.path,
      filePath: route.filePath,
      params: route.params,
    })),
    base: config.base,
  }

  // 生成 HTML shell
  const html = generateHTMLDocument(
    config.site.title,
    `<div id="app"></div>\n  <script>window.__LYT_ROUTES__ = ${JSON.stringify(manifest.routes)};</script>`,
    config,
  )

  // 写入文件
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf-8')
  fs.writeFileSync(
    path.join(outDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8',
  )

  return manifest
}

// ================================================================
//  工具函数导出
// ================================================================

/**
 * 简单 VNode 渲染为 HTML 字符串（导出用于测试）
 */
export { simpleRenderToString }

/**
 * 生成 HTML 文档（导出用于测试）
 */
export { generateHTMLDocument }
