/**
 * LytX - 中间件系统
 *
 * 提供 HTTP 请求/响应的中间件链支持。
 * 包含内置中间件：CORS、Logger、Body Parser、Auth、Rate Limit。
 *
 * 中间件配置示例（lytx.config.ts）：
 *   middleware: {
 *     global: ['logger', 'cors', 'body-parser'],
 *     '/api/admin': ['auth'],
 *     '/api': ['rate-limit']
 *   }
 *
 * 纯原生零依赖实现。
 */

import type { ApiRequest, ApiResponse } from './api-routes'

// ================================================================
//  中间件类型定义
// ================================================================

/** 中间件上下文（可读写请求和响应） */
export interface MiddlewareContext {
  request: ApiRequest
  response: ApiResponse
  terminated: boolean
}

/** 中间件定义 */
export interface Middleware {
  /** 中间件名称 */
  name: string
  /** 执行中间件逻辑 */
  execute(
    ctx: MiddlewareContext,
    next: () => void,
  ): void | Promise<void>
}

/** 中间件配置 */
export interface MiddlewareConfig {
  /** 全局中间件列表 */
  global?: string[]
  /** 路径特定中间件映射 */
  [pathPattern: string]: string[] | undefined
}

// ================================================================
//  内置中间件：CORS
// ================================================================

/** CORS 中间件选项 */
export interface CorsOptions {
  origin?: string
  methods?: string
  allowedHeaders?: string
  maxAge?: number
}

/**
 * 创建 CORS 中间件
 *
 * 添加跨域资源共享相关响应头。
 */
export function createCorsMiddleware(options?: CorsOptions): Middleware {
  const origin = options?.origin || '*'
  const methods = options?.methods || 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD'
  const allowedHeaders = options?.allowedHeaders || 'Content-Type, Authorization'
  const maxAge = options?.maxAge || 86400

  return {
    name: 'cors',
    execute(ctx, next) {
      ctx.response.headers = ctx.response.headers || {}
      ctx.response.headers['Access-Control-Allow-Origin'] = origin
      ctx.response.headers['Access-Control-Allow-Methods'] = methods
      ctx.response.headers['Access-Control-Allow-Headers'] = allowedHeaders
      ctx.response.headers['Access-Control-Max-Age'] = String(maxAge)

      // 处理预检请求
      if (ctx.request.method === 'OPTIONS') {
        ctx.response.status = 204
        ctx.response.body = null
        ctx.terminated = true
        return
      }

      next()
    },
  }
}

/** 默认 CORS 中间件 */
export const corsMiddleware: Middleware = createCorsMiddleware()

// ================================================================
//  内置中间件：Logger
// ================================================================

/** 日志条目 */
export interface LogEntry {
  timestamp: string
  method: string
  path: string
  status: number
  duration: number
}

/** 日志存储（用于测试） */
export const logStore: LogEntry[] = []

/**
 * 创建 Logger 中间件
 *
 * 记录请求日志（方法、路径、状态码、耗时）。
 */
export function createLoggerMiddleware(): Middleware {
  return {
    name: 'logger',
    execute(ctx, next) {
      const start = Date.now()
      next()
      const duration = Date.now() - start

      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        method: ctx.request.method,
        path: ctx.request.path,
        status: ctx.response.status,
        duration,
      }

      logStore.push(entry)
    },
  }
}

/** 默认 Logger 中间件 */
export const loggerMiddleware: Middleware = createLoggerMiddleware()

// ================================================================
//  内置中间件：Body Parser
// ================================================================

/**
 * 创建 Body Parser 中间件
 *
 * 解析 JSON 格式的请求体。
 */
export function createBodyParserMiddleware(): Middleware {
  return {
    name: 'body-parser',
    execute(ctx, next) {
      const contentType = ctx.request.headers['content-type'] || ''
      if (contentType.includes('application/json') && typeof ctx.request.body === 'string') {
        try {
          ctx.request.body = JSON.parse(ctx.request.body)
        } catch {
          // JSON 解析失败，保持原始字符串
        }
      }
      next()
    },
  }
}

/** 默认 Body Parser 中间件 */
export const bodyParserMiddleware: Middleware = createBodyParserMiddleware()

// ================================================================
//  内置中间件：Auth
// ================================================================

/** Auth 中间件选项 */
export interface AuthOptions {
  /** 验证函数，返回 true 表示认证通过 */
  validate?: (request: ApiRequest) => boolean
  /** 认证失败时的状态码 */
  failStatus?: number
  /** 认证失败时的消息 */
  failMessage?: string
}

/**
 * 创建 Auth 中间件
 *
 * 基本的认证检查中间件。
 * 默认检查请求头中是否包含 Authorization。
 */
export function createAuthMiddleware(options?: AuthOptions): Middleware {
  const validate = options?.validate || ((req: ApiRequest) => {
    return !!req.headers['authorization']
  })
  const failStatus = options?.failStatus || 401
  const failMessage = options?.failMessage || 'Unauthorized'

  return {
    name: 'auth',
    execute(ctx, next) {
      if (validate(ctx.request)) {
        next()
      } else {
        ctx.response.status = failStatus
        ctx.response.body = { error: failMessage }
        ctx.response.headers = ctx.response.headers || {}
        ctx.response.headers['WWW-Authenticate'] = 'Bearer'
        ctx.terminated = true
      }
    },
  }
}

/** 默认 Auth 中间件 */
export const authMiddleware: Middleware = createAuthMiddleware()

// ================================================================
//  内置中间件：Rate Limit
// ================================================================

/** Rate Limit 中间件选项 */
export interface RateLimitOptions {
  /** 时间窗口（毫秒） */
  windowMs?: number
  /** 时间窗口内最大请求数 */
  maxRequests?: number
}

/** 速率限制存储 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

/**
 * 创建 Rate Limit 中间件
 *
 * 基于客户端 IP 的简单速率限制。
 */
export function createRateLimitMiddleware(options?: RateLimitOptions): Middleware {
  const windowMs = options?.windowMs || 60000
  const maxRequests = options?.maxRequests || 100

  return {
    name: 'rate-limit',
    execute(ctx, next) {
      // 使用客户端标识（优先 X-Forwarded-For，其次 X-Real-IP，最后 fallback 到路径）
      const clientId = ctx.request.headers['x-forwarded-for']
        || ctx.request.headers['x-real-ip']
        || ctx.request.path

      const now = Date.now()
      let record = rateLimitStore.get(clientId)

      if (!record || now > record.resetTime) {
        record = { count: 0, resetTime: now + windowMs }
        rateLimitStore.set(clientId, record)
      }

      record.count++

      // 添加速率限制相关响应头
      ctx.response.headers = ctx.response.headers || {}
      ctx.response.headers['X-RateLimit-Limit'] = String(maxRequests)
      ctx.response.headers['X-RateLimit-Remaining'] = String(Math.max(0, maxRequests - record.count))
      ctx.response.headers['X-RateLimit-Reset'] = String(Math.ceil(record.resetTime / 1000))

      if (record.count > maxRequests) {
        ctx.response.status = 429
        ctx.response.body = { error: 'Too Many Requests' }
        ctx.terminated = true
        return
      }

      next()
    },
  }
}

/** 默认 Rate Limit 中间件 */
export const rateLimitMiddleware: Middleware = createRateLimitMiddleware()

// ================================================================
//  中间件注册表
// ================================================================

/** 内置中间件注册表 */
const middlewareRegistry = new Map<string, Middleware>([
  ['cors', corsMiddleware],
  ['logger', loggerMiddleware],
  ['body-parser', bodyParserMiddleware],
  ['auth', authMiddleware],
  ['rate-limit', rateLimitMiddleware],
])

/**
 * 注册自定义中间件
 *
 * @param name 中间件名称
 * @param middleware 中间件实例
 */
export function registerMiddleware(name: string, middleware: Middleware): void {
  middlewareRegistry.set(name, middleware)
}

/**
 * 获取已注册的中间件
 *
 * @param name 中间件名称
 * @returns 中间件实例，未找到返回 null
 */
export function getMiddleware(name: string): Middleware | null {
  return middlewareRegistry.get(name) || null
}

/**
 * 获取所有已注册的中间件名称
 *
 * @returns 中间件名称列表
 */
export function getRegisteredMiddlewareNames(): string[] {
  return Array.from(middlewareRegistry.keys())
}

// ================================================================
//  中间件链执行
// ================================================================

/**
 * 执行中间件链
 *
 * 根据配置确定中间件列表，按顺序执行。
 * 如果中间件调用 next()，继续执行下一个中间件。
 * 如果中间件设置 terminated=true，终止后续中间件和处理器执行。
 *
 * @param middlewares 中间件列表
 * @param request API 请求
 * @param finalHandler 最终处理器（所有中间件通过后执行）
 * @returns API 响应
 */
export async function executeMiddlewareChain(
  middlewares: Middleware[],
  request: ApiRequest,
  finalHandler: () => ApiResponse,
): Promise<ApiResponse> {
  const ctx: MiddlewareContext = {
    request,
    response: { status: 200, body: null },
    terminated: false,
  }

  let index = 0

  const runNext = (): void | Promise<void> => {
    if (ctx.terminated) return

    if (index < middlewares.length) {
      const middleware = middlewares[index]
      index++
      return middleware.execute(ctx, runNext)
    }

    // 所有中间件执行完毕，调用最终处理器
    const result = finalHandler()
    if (result) {
      // 合并响应：保留中间件设置的 headers，用最终处理器的值覆盖
      const mergedHeaders = { ...(ctx.response.headers || {}), ...(result.headers || {}) }
      ctx.response = { ...result, headers: mergedHeaders }
    }
  }

  await runNext()

  return ctx.response
}

/**
 * 根据路径和配置解析中间件列表
 *
 * @param config 中间件配置
 * @param requestPath 请求路径
 * @returns 应用于该路径的中间件列表
 */
export function resolveMiddlewares(
  config: MiddlewareConfig,
  requestPath: string,
): Middleware[] {
  const result: Middleware[] = []

  // 1. 添加全局中间件
  if (config.global) {
    for (const name of config.global) {
      const mw = middlewareRegistry.get(name)
      if (mw) result.push(mw)
    }
  }

  // 2. 添加路径特定中间件（按路径长度降序匹配，更具体的路径优先）
  const pathEntries = Object.entries(config)
    .filter(([key]) => key !== 'global')
    .sort((a, b) => b[0].length - a[0].length)

  for (const [pathPattern, names] of pathEntries) {
    if (names && matchPathPattern(pathPattern, requestPath)) {
      for (const name of names) {
        const mw = middlewareRegistry.get(name)
        if (mw && !result.find(m => m.name === mw.name)) {
          result.push(mw)
        }
      }
    }
  }

  return result
}

/**
 * 路径模式匹配
 *
 * @param pattern 路径模式（如 '/api/admin'）
 * @param requestPath 请求路径（如 '/api/admin/users'）
 * @returns 是否匹配
 */
function matchPathPattern(pattern: string, requestPath: string): boolean {
  // 精确匹配或前缀匹配
  if (requestPath === pattern) return true
  if (requestPath.startsWith(pattern + '/')) return true
  return false
}

/**
 * 清除速率限制存储和日志存储（用于测试）
 */
export function clearMiddlewareState(): void {
  rateLimitStore.clear()
  logStore.length = 0
}
