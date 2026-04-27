/**
 * LytX - 文件式 API 路由系统
 *
 * 基于文件系统的 API 路由解析，类似 Next.js API Routes。
 * 扫描 API 目录，将文件结构映射为 API 路由规则。
 *
 * 路由解析规则：
 *   src/pages/api/hello.ts           → GET /api/hello
 *   src/pages/api/users/[id].ts      → GET/POST /api/users/:id
 *   src/pages/api/auth/[...path].ts  → All methods /api/auth/*
 *
 * 纯原生零依赖实现，使用 Node.js fs/path 模块。
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

// ================================================================
//  API 类型定义
// ================================================================

/** API 请求 */
export interface ApiRequest {
  method: string
  path: string
  params: Record<string, string>
  query: Record<string, string>
  headers: Record<string, string>
  body: any
}

/** API 响应 */
export interface ApiResponse {
  status: number
  headers?: Record<string, string>
  body: any
}

/** API 路由定义 */
export interface ApiRoute {
  /** 路由路径模式（如 '/api/hello'、'/api/users/:id'） */
  pattern: string
  /** 文件路径（相对于 apiDir） */
  filePath: string
  /** 动态参数名列表 */
  params: string[]
  /** 是否为 catch-all 路由 */
  isCatchAll: boolean
  /** 支持的 HTTP 方法列表 */
  methods: string[]
  /** 路由处理器 */
  handler: ApiHandler | ApiMethodHandlers
}

/** API 路由匹配结果 */
export interface ApiRouteMatch {
  route: ApiRoute
  params: Record<string, string>
}

/** API 处理器函数格式 */
export type ApiHandler = (request: ApiRequest) => ApiResponse | Promise<ApiResponse>

/** API 处理器对象格式（按方法区分） */
export interface ApiMethodHandlers {
  GET?: ApiHandler
  POST?: ApiHandler
  PUT?: ApiHandler
  DELETE?: ApiHandler
  PATCH?: ApiHandler
  HEAD?: ApiHandler
  OPTIONS?: ApiHandler
  [method: string]: ApiHandler | undefined
}

// ================================================================
//  文件扫描
// ================================================================

/**
 * 递归扫描 API 目录，获取所有 .ts 和 .js 文件
 *
 * @param dir 目录路径
 * @returns 文件路径列表（相对于 dir）
 */
function scanApiFiles(dir: string): string[] {
  const files: string[] = []

  if (!fs.existsSync(dir)) {
    return files
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      const subFiles = scanApiFiles(fullPath)
      for (const subFile of subFiles) {
        files.push(path.join(entry.name, subFile))
      }
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
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
 * 将 API 文件路径转换为路由路径模式
 *
 * @param filePath 相对于 apiDir 的文件路径
 * @returns 路由路径模式、参数列表、是否 catch-all
 */
function apiFilePathToPattern(filePath: string): {
  pattern: string
  params: string[]
  isCatchAll: boolean
} | null {
  const ext = path.extname(filePath)
  const nameWithoutExt = filePath.slice(0, -ext.length)

  const dir = path.dirname(nameWithoutExt)
  const fileName = path.basename(nameWithoutExt)

  let urlPath = ''
  const params: string[] = []
  let isCatchAll = false

  // catch-all 路由 [...path]
  if (fileName.startsWith('[...') && fileName.endsWith(']')) {
    isCatchAll = true
    const paramName = fileName.slice(4, -1)
    params.push(paramName)

    if (dir === '.') {
      urlPath = '/*'
    } else {
      urlPath = '/' + dir.replace(/\\/g, '/') + '/*'
    }
  }
  // 动态路由 [id]
  else if (fileName.startsWith('[') && fileName.endsWith(']')) {
    const paramName = fileName.slice(1, -1)
    params.push(paramName)

    if (dir === '.') {
      urlPath = '/:' + paramName
    } else {
      urlPath = '/' + dir.replace(/\\/g, '/') + '/:' + paramName
    }
  }
  // 普通路由
  else {
    if (dir === '.') {
      urlPath = '/' + fileName
    } else {
      urlPath = '/' + dir.replace(/\\/g, '/') + '/' + fileName
    }
  }

  return { pattern: urlPath, params, isCatchAll }
}

/**
 * 将路由路径模式转换为正则表达式
 *
 * @param pattern 路由路径模式
 * @returns 正则表达式和参数名列表
 */
function patternToRegex(pattern: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = []

  // 处理 catch-all 路由
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2)
    return {
      regex: new RegExp(`^${escapeRegex(prefix)}/(.+)$`),
      paramNames: ['_catchAll'],
    }
  }

  // 处理动态参数
  const regexStr = pattern.replace(/:(\w+)/g, (_match, paramName) => {
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
 * 解析 API 目录中的所有路由
 *
 * 扫描指定目录，将文件结构映射为 API 路由规则列表。
 * 注意：返回的路由不包含 handler（需要后续加载模块填充）。
 *
 * @param apiDir API 目录的绝对路径
 * @returns API 路由列表
 *
 * @example
 *   const routes = resolveApiRoutes('/project/src/pages/api')
 *   // [
 *   //   { pattern: '/hello', filePath: 'hello.ts', params: [], isCatchAll: false, methods: ['GET'], handler: null },
 *   //   { pattern: '/users/:id', filePath: 'users/[id].ts', params: ['id'], isCatchAll: false, methods: ['GET','POST'], handler: null },
 *   // ]
 */
export function resolveApiRoutes(apiDir: string): ApiRoute[] {
  const files = scanApiFiles(apiDir)
  const routes: ApiRoute[] = []

  for (const file of files) {
    const result = apiFilePathToPattern(file)
    if (result) {
      routes.push({
        pattern: result.pattern,
        filePath: file.replace(/\\/g, '/'),
        params: result.params,
        isCatchAll: result.isCatchAll,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
        handler: () => ({ status: 501, body: { error: 'Handler not loaded' } }),
      })
    }
  }

  // 排序：静态路由优先，动态路由其次，catch-all 最后
  routes.sort((a, b) => {
    if (a.isCatchAll && !b.isCatchAll) return 1
    if (!a.isCatchAll && b.isCatchAll) return -1

    const aDynamic = a.params.length
    const bDynamic = b.params.length
    if (aDynamic !== bDynamic) return aDynamic - bDynamic

    return b.pattern.length - a.pattern.length
  })

  return routes
}

/**
 * 匹配 API 路由
 *
 * 根据请求路径和方法在路由列表中查找匹配的路由。
 *
 * @param routes API 路由列表
 * @param pathname 请求路径
 * @param method HTTP 方法
 * @returns 匹配结果，未找到返回 null
 *
 * @example
 *   const result = matchApiRoute(routes, '/users/123', 'GET')
 *   // { route: { pattern: '/users/:id', ... }, params: { id: '123' } }
 */
export function matchApiRoute(
  routes: ApiRoute[],
  pathname: string,
  method: string,
): ApiRouteMatch | null {
  for (const route of routes) {
    // 静态路由精确匹配
    if (route.params.length === 0 && !route.isCatchAll) {
      if (route.pattern === pathname) {
        return { route, params: {} }
      }
      continue
    }

    // 动态路由和 catch-all 路由
    const { regex, paramNames } = patternToRegex(route.pattern)
    const match = pathname.match(regex)

    if (match) {
      const params: Record<string, string> = {}
      for (let i = 0; i < paramNames.length; i++) {
        params[paramNames[i]] = match[i + 1]
      }
      return { route, params }
    }
  }

  return null
}

/**
 * 处理 API 请求
 *
 * 调用路由的处理器函数，返回 API 响应。
 * 支持对象格式（按方法区分）和函数格式（统一处理）。
 *
 * @param route API 路由
 * @param request API 请求
 * @returns API 响应
 *
 * @example
 *   const response = handleApiRequest(route, {
 *     method: 'GET',
 *     path: '/hello',
 *     params: {},
 *     query: {},
 *     headers: {},
 *     body: null,
 *   })
 *   // { status: 200, body: { message: 'Hello' } }
 */
export function handleApiRequest(
  route: ApiRoute,
  request: ApiRequest,
): ApiResponse {
  const handler = route.handler

  try {
    if (typeof handler === 'function') {
      // 函数格式：统一处理所有方法
      return handler(request) as ApiResponse
    }

    // 对象格式：按方法区分
    const methodHandler = (handler as ApiMethodHandlers)[request.method]
    if (methodHandler) {
      return methodHandler(request) as ApiResponse
    }

    // 方法不允许
    return {
      status: 405,
      headers: { 'Allow': Object.keys(handler as ApiMethodHandlers).join(', ') },
      body: { error: `Method ${request.method} not allowed` },
    }
  } catch (err: any) {
    return {
      status: 500,
      body: { error: 'Internal Server Error', message: err.message },
    }
  }
}

/**
 * 解析查询字符串
 *
 * @param queryString 查询字符串（不含 '?'）
 * @returns 键值对对象
 */
export function parseQueryString(queryString: string): Record<string, string> {
  const query: Record<string, string> = {}
  if (!queryString) return query

  const pairs = queryString.split('&')
  for (const pair of pairs) {
    const [key, value] = pair.split('=')
    if (key) {
      query[decodeURIComponent(key)] = value ? decodeURIComponent(value) : ''
    }
  }

  return query
}

/**
 * 从文件路径生成 API 路由模式（用于测试）
 *
 * @param filePath 相对于 apiDir 的文件路径
 * @returns 路由信息，解析失败返回 null
 */
export function parseApiFilePath(filePath: string): {
  pattern: string
  params: string[]
  isCatchAll: boolean
} | null {
  return apiFilePathToPattern(filePath)
}
