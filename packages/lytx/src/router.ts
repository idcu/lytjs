/**
 * LytX - 文件路由系统
 *
 * 基于文件系统的路由解析，类似 Next.js App Router。
 * 扫描 pages 目录，将文件结构映射为路由规则。
 *
 * 路由解析规则：
 *   src/pages/index.ts          → /
 *   src/pages/about.ts          → /about
 *   src/pages/blog/index.ts     → /blog
 *   src/pages/blog/[slug].ts    → /blog/:slug（动态路由）
 *   src/pages/blog/[...slug].ts → /blog/*（catch-all 路由）
 *   src/pages/404.ts            → 404 页面
 *
 * 纯原生零依赖实现，使用 Node.js fs/path 模块。
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import type { Route, RouteMatch } from './types'

// ================================================================
//  文件扫描
// ================================================================

/**
 * 递归扫描目录，获取所有 .ts 和 .js 文件
 *
 * @param dir 目录路径
 * @returns 文件路径列表（相对于 dir）
 */
function scanFiles(dir: string): string[] {
  const files: string[] = []

  if (!fs.existsSync(dir)) {
    return files
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      // 递归扫描子目录
      const subFiles = scanFiles(fullPath)
      for (const subFile of subFiles) {
        files.push(path.join(entry.name, subFile))
      }
    } else if (entry.isFile()) {
      // 只处理 .ts 和 .js 文件
      if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
        // 排除配置文件和测试文件
        if (!entry.name.startsWith('_') && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.js')) {
          files.push(entry.name)
        }
      }
    }
  }

  return files
}

// ================================================================
//  路由解析
// ================================================================

/**
 * 将文件路径转换为路由路径
 *
 * @param filePath 相对于 pagesDir 的文件路径
 * @returns 路由信息
 */
function filePathToRoute(filePath: string): Route | null {
  // 移除文件扩展名
  const ext = path.extname(filePath)
  const nameWithoutExt = filePath.slice(0, -ext.length)

  // 分离目录和文件名
  const dir = path.dirname(nameWithoutExt)
  const fileName = path.basename(nameWithoutExt)

  // 构建 URL 路径
  let urlPath = ''
  const params: string[] = []
  let isCatchAll = false
  let isIndex = false
  let is404 = false

  // 检查是否为 404 页面
  if (fileName === '404' && dir === '.') {
    is404 = true
    urlPath = '/404'
  }
  // 检查 catch-all 路由 [...slug]
  else if (fileName.startsWith('[...') && fileName.endsWith(']')) {
    isCatchAll = true
    const paramName = fileName.slice(4, -1)
    params.push(paramName)

    if (dir === '.') {
      urlPath = '/*'
    } else {
      urlPath = '/' + dir.replace(/\\/g, '/') + '/*'
    }
  }
  // 检查动态路由 [slug]
  else if (fileName.startsWith('[') && fileName.endsWith(']')) {
    const paramName = fileName.slice(1, -1)
    params.push(paramName)

    if (dir === '.') {
      urlPath = '/:' + paramName
    } else {
      urlPath = '/' + dir.replace(/\\/g, '/') + '/:' + paramName
    }
  }
  // 检查 index 页面
  else if (fileName === 'index') {
    isIndex = true

    if (dir === '.') {
      urlPath = '/'
    } else {
      urlPath = '/' + dir.replace(/\\/g, '/')
    }
  }
  // 普通页面
  else {
    if (dir === '.') {
      urlPath = '/' + fileName
    } else {
      urlPath = '/' + dir.replace(/\\/g, '/') + '/' + fileName
    }
  }

  return {
    path: urlPath,
    filePath: filePath.replace(/\\/g, '/'),
    params: params.length > 0 ? params : undefined,
    isCatchAll,
    isIndex,
    is404,
  }
}

// ================================================================
//  路由匹配
// ================================================================

/**
 * 将路由路径转换为正则表达式
 *
 * @param routePath 路由路径
 * @returns 正则表达式和参数名列表
 */
function routeToRegex(routePath: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = []

  // 处理 catch-all 路由
  if (routePath.endsWith('/*')) {
    const prefix = routePath.slice(0, -2)
    return {
      regex: new RegExp(`^${escapeRegex(prefix)}/(.+)$`),
      paramNames: ['_catchAll'],
    }
  }

  // 处理动态参数
  const regexStr = routePath.replace(/:(\w+)/g, (_match, paramName) => {
    paramNames.push(paramName)
    return '([^/]+)'
  })

  return {
    regex: new RegExp(`^${regexStr}$`),
    paramNames,
  }
}

/**
 * 转义正则特殊字符
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ================================================================
//  公共 API
// ================================================================

/**
 * 解析 pages 目录中的所有路由
 *
 * 扫描指定目录，将文件结构映射为路由规则列表。
 *
 * @param pagesDir 页面目录的绝对路径
 * @returns 路由列表
 *
 * @example
 *   const routes = resolveRoutes('/project/src/pages')
 *   // [
 *   //   { path: '/', filePath: 'index.ts', isIndex: true },
 *   //   { path: '/about', filePath: 'about.ts' },
 *   //   { path: '/blog/:slug', filePath: 'blog/[slug].ts', params: ['slug'] },
 *   // ]
 */
export function resolveRoutes(pagesDir: string): Route[] {
  const files = scanFiles(pagesDir)
  const routes: Route[] = []

  for (const file of files) {
    const route = filePathToRoute(file)
    if (route) {
      routes.push(route)
    }
  }

  // 按路由路径排序：静态路由优先，动态路由其次，catch-all 最后
  routes.sort((a, b) => {
    // 404 页面放最后
    if (a.is404 && !b.is404) return 1
    if (!a.is404 && b.is404) return -1

    // catch-all 放后面
    if (a.isCatchAll && !b.isCatchAll) return 1
    if (!a.isCatchAll && b.isCatchAll) return -1

    // 动态路由放后面
    const aDynamic = a.params ? a.params.length : 0
    const bDynamic = b.params ? b.params.length : 0
    if (aDynamic !== bDynamic) return aDynamic - bDynamic

    // 按路径长度降序（更具体的路由优先）
    return b.path.length - a.path.length
  })

  return routes
}

/**
 * 匹配路由
 *
 * 根据请求路径在路由列表中查找匹配的路由。
 *
 * @param routes 路由列表
 * @param pathname 请求路径
 * @returns 匹配结果，未找到返回 null
 *
 * @example
 *   const result = matchRoute(routes, '/blog/hello-world')
 *   // { route: { path: '/blog/:slug', ... }, params: { slug: 'hello-world' } }
 */
export function matchRoute(routes: Route[], pathname: string): RouteMatch | null {
  for (const route of routes) {
    // 精确匹配静态路由
    if (!route.params && !route.isCatchAll) {
      if (route.path === pathname) {
        return { route, params: {} }
      }
      continue
    }

    // 匹配动态路由和 catch-all 路由
    const { regex, paramNames } = routeToRegex(route.path)
    const match = pathname.match(regex)

    if (match) {
      const params: Record<string, string> = {}
      for (let i = 0; i < paramNames.length; i++) {
        params[paramNames[i]] = match[i + 1]
      }
      return { route, params }
    }
  }

  // 查找 404 页面
  const notFoundRoute = routes.find(r => r.is404)
  if (notFoundRoute) {
    return { route: notFoundRoute, params: {} }
  }

  return null
}

/**
 * 从文件路径生成路由路径（用于测试）
 *
 * @param filePath 相对于 pagesDir 的文件路径
 * @returns 路由信息，解析失败返回 null
 */
export function parseFilePath(filePath: string): Route | null {
  return filePathToRoute(filePath)
}
