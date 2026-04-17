/**
 * LytX API 路由和中间件测试套件
 *
 * 覆盖 API 路由解析、路由匹配、请求处理、中间件执行等核心功能。
 */

import { describe, it, expect, beforeEach } from '../../test-utils/src/index'

// ================================================================
//  API 路由解析测试
// ================================================================

describe('LytX - API 路由解析', () => {
  const { parseApiFilePath, resolveApiRoutes } = require('../src/api-routes')
  const fs = require('node:fs')
  const path = require('node:path')
  const os = require('node:os')

  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lytx-api-'))
  })

  it('应将 hello.ts 解析为 /hello', () => {
    const result = parseApiFilePath('hello.ts')
    expect(result).not.toBeNull()
    expect(result!.pattern).toBe('/hello')
    expect(result!.params).toEqual([])
    expect(result!.isCatchAll).toBe(false)
  })

  it('应将 users/[id].ts 解析为动态路由 /users/:id', () => {
    const result = parseApiFilePath('users/[id].ts')
    expect(result).not.toBeNull()
    expect(result!.pattern).toBe('/users/:id')
    expect(result!.params).toEqual(['id'])
    expect(result!.isCatchAll).toBe(false)
  })

  it('应将 auth/[...path].ts 解析为 catch-all 路由 /auth/*', () => {
    const result = parseApiFilePath('auth/[...path].ts')
    expect(result).not.toBeNull()
    expect(result!.pattern).toBe('/auth/*')
    expect(result!.params).toEqual(['path'])
    expect(result!.isCatchAll).toBe(true)
  })

  it('应将嵌套目录文件解析为嵌套路由', () => {
    const result = parseApiFilePath('v1/users/[id].ts')
    expect(result).not.toBeNull()
    expect(result!.pattern).toBe('/v1/users/:id')
    expect(result!.params).toEqual(['id'])
  })

  it('应从目录解析多个 API 路由', () => {
    fs.mkdirSync(path.join(tmpDir, 'users'), { recursive: true })
    fs.writeFileSync(path.join(tmpDir, 'hello.ts'), '')
    fs.writeFileSync(path.join(tmpDir, 'users', '[id].ts'), '')

    const routes = resolveApiRoutes(tmpDir)
    expect(routes.length).toBe(2)

    const patterns = routes.map((r: any) => r.pattern)
    expect(patterns).toContain('/hello')
    expect(patterns).toContain('/users/:id')
  })

  it('路由排序应静态路由优先于动态路由', () => {
    fs.mkdirSync(path.join(tmpDir, 'users'), { recursive: true })
    fs.writeFileSync(path.join(tmpDir, 'users', 'list.ts'), '')
    fs.writeFileSync(path.join(tmpDir, 'users', '[id].ts'), '')
    fs.writeFileSync(path.join(tmpDir, 'users', '[...path].ts'), '')

    const routes = resolveApiRoutes(tmpDir)
    const listIndex = routes.findIndex((r: any) => r.pattern === '/users/list')
    const idIndex = routes.findIndex((r: any) => r.pattern === '/users/:id')
    const catchAllIndex = routes.findIndex((r: any) => r.pattern === '/users/*')

    expect(listIndex).toBeLessThan(idIndex)
    expect(idIndex).toBeLessThan(catchAllIndex)
  })

  it('空目录应返回空路由列表', () => {
    const routes = resolveApiRoutes(tmpDir)
    expect(routes).toHaveLength(0)
  })

  it('应忽略以 _ 开头的文件', () => {
    fs.writeFileSync(path.join(tmpDir, '_helper.ts'), '')
    fs.writeFileSync(path.join(tmpDir, 'hello.ts'), '')

    const routes = resolveApiRoutes(tmpDir)
    expect(routes).toHaveLength(1)
    expect(routes[0].pattern).toBe('/hello')
  })

  it('应忽略测试文件', () => {
    fs.writeFileSync(path.join(tmpDir, 'hello.test.ts'), '')
    fs.writeFileSync(path.join(tmpDir, 'hello.ts'), '')

    const routes = resolveApiRoutes(tmpDir)
    expect(routes).toHaveLength(1)
  })
})

// ================================================================
//  API 路由匹配测试
// ================================================================

describe('LytX - API 路由匹配', () => {
  const { matchApiRoute } = require('../src/api-routes')

  const routes = [
    { pattern: '/hello', filePath: 'hello.ts', params: [], isCatchAll: false, methods: ['GET', 'POST'], handler: () => ({ status: 200, body: {} }) },
    { pattern: '/users/:id', filePath: 'users/[id].ts', params: ['id'], isCatchAll: false, methods: ['GET', 'PUT', 'DELETE'], handler: () => ({ status: 200, body: {} }) },
    { pattern: '/auth/*', filePath: 'auth/[...path].ts', params: ['path'], isCatchAll: true, methods: ['GET', 'POST'], handler: () => ({ status: 200, body: {} }) },
  ]

  it('应匹配 GET /hello', () => {
    const result = matchApiRoute(routes, '/hello', 'GET')
    expect(result).not.toBeNull()
    expect(result!.route.pattern).toBe('/hello')
    expect(result!.params).toEqual({})
  })

  it('应匹配 POST /hello', () => {
    const result = matchApiRoute(routes, '/hello', 'POST')
    expect(result).not.toBeNull()
    expect(result!.route.pattern).toBe('/hello')
  })

  it('应匹配动态路由 GET /users/123', () => {
    const result = matchApiRoute(routes, '/users/123', 'GET')
    expect(result).not.toBeNull()
    expect(result!.route.pattern).toBe('/users/:id')
    expect(result!.params).toEqual({ id: '123' })
  })

  it('应匹配 PUT /users/456', () => {
    const result = matchApiRoute(routes, '/users/456', 'PUT')
    expect(result).not.toBeNull()
    expect(result!.params).toEqual({ id: '456' })
  })

  it('应匹配 DELETE /users/789', () => {
    const result = matchApiRoute(routes, '/users/789', 'DELETE')
    expect(result).not.toBeNull()
    expect(result!.params).toEqual({ id: '789' })
  })

  it('应匹配 catch-all 路由 /auth/login', () => {
    const result = matchApiRoute(routes, '/auth/login', 'GET')
    expect(result).not.toBeNull()
    expect(result!.route.pattern).toBe('/auth/*')
  })

  it('应匹配 catch-all 路由 /auth/a/b/c', () => {
    const result = matchApiRoute(routes, '/auth/a/b/c', 'POST')
    expect(result).not.toBeNull()
    expect(result!.route.isCatchAll).toBe(true)
  })

  it('未匹配路由应返回 null', () => {
    const result = matchApiRoute(routes, '/nonexistent', 'GET')
    expect(result).toBeNull()
  })

  it('应优先匹配静态路由而非动态路由', () => {
    const routesWithStatic = [
      { pattern: '/users/list', filePath: 'users/list.ts', params: [], isCatchAll: false, methods: ['GET'], handler: () => ({ status: 200, body: {} }) },
      { pattern: '/users/:id', filePath: 'users/[id].ts', params: ['id'], isCatchAll: false, methods: ['GET'], handler: () => ({ status: 200, body: {} }) },
    ]
    const result = matchApiRoute(routesWithStatic, '/users/list', 'GET')
    expect(result).not.toBeNull()
    expect(result!.route.pattern).toBe('/users/list')
  })
})

// ================================================================
//  API 请求处理测试
// ================================================================

describe('LytX - API 请求处理', () => {
  const { handleApiRequest } = require('../src/api-routes')

  it('函数格式处理器应正常工作', () => {
    const route = {
      pattern: '/hello',
      filePath: 'hello.ts',
      params: [],
      isCatchAll: false,
      methods: ['GET'],
      handler: (req: any) => ({ status: 200, body: { message: 'Hello' } }),
    }

    const request = {
      method: 'GET',
      path: '/hello',
      params: {},
      query: {},
      headers: {},
      body: null,
    }

    const response = handleApiRequest(route, request)
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ message: 'Hello' })
  })

  it('对象格式处理器应按方法调用', () => {
    const route = {
      pattern: '/users',
      filePath: 'users.ts',
      params: [],
      isCatchAll: false,
      methods: ['GET', 'POST'],
      handler: {
        GET: () => ({ status: 200, body: { users: [] } }),
        POST: () => ({ status: 201, body: { created: true } }),
      },
    }

    const getResponse = handleApiRequest(route, {
      method: 'GET', path: '/users', params: {}, query: {}, headers: {}, body: null,
    })
    expect(getResponse.status).toBe(200)
    expect(getResponse.body).toEqual({ users: [] })

    const postResponse = handleApiRequest(route, {
      method: 'POST', path: '/users', params: {}, query: {}, headers: {}, body: null,
    })
    expect(postResponse.status).toBe(201)
    expect(postResponse.body).toEqual({ created: true })
  })

  it('不支持的方法应返回 405', () => {
    const route = {
      pattern: '/hello',
      filePath: 'hello.ts',
      params: [],
      isCatchAll: false,
      methods: ['GET'],
      handler: {
        GET: () => ({ status: 200, body: {} }),
      },
    }

    const response = handleApiRequest(route, {
      method: 'DELETE', path: '/hello', params: {}, query: {}, headers: {}, body: null,
    })
    expect(response.status).toBe(405)
    expect(response.body.error).toContain('not allowed')
  })

  it('处理器抛出异常应返回 500', () => {
    const route = {
      pattern: '/error',
      filePath: 'error.ts',
      params: [],
      isCatchAll: false,
      methods: ['GET'],
      handler: () => { throw new Error('Something went wrong') },
    }

    const response = handleApiRequest(route, {
      method: 'GET', path: '/error', params: {}, query: {}, headers: {}, body: null,
    })
    expect(response.status).toBe(500)
    expect(response.body.error).toBe('Internal Server Error')
  })

  it('处理器应能访问请求参数', () => {
    const route = {
      pattern: '/users/:id',
      filePath: 'users/[id].ts',
      params: ['id'],
      isCatchAll: false,
      methods: ['GET'],
      handler: (req: any) => ({ status: 200, body: { id: req.params.id } }),
    }

    const response = handleApiRequest(route, {
      method: 'GET', path: '/users/42', params: { id: '42' }, query: {}, headers: {}, body: null,
    })
    expect(response.body).toEqual({ id: '42' })
  })

  it('处理器应能访问查询参数', () => {
    const route = {
      pattern: '/search',
      filePath: 'search.ts',
      params: [],
      isCatchAll: false,
      methods: ['GET'],
      handler: (req: any) => ({ status: 200, body: { q: req.query.q } }),
    }

    const response = handleApiRequest(route, {
      method: 'GET', path: '/search', params: {}, query: { q: 'hello' }, headers: {}, body: null,
    })
    expect(response.body).toEqual({ q: 'hello' })
  })

  it('处理器应能访问请求体', () => {
    const route = {
      pattern: '/data',
      filePath: 'data.ts',
      params: [],
      isCatchAll: false,
      methods: ['POST'],
      handler: (req: any) => ({ status: 200, body: { received: req.body } }),
    }

    const response = handleApiRequest(route, {
      method: 'POST', path: '/data', params: {}, query: {}, headers: {}, body: { name: 'test' },
    })
    expect(response.body).toEqual({ received: { name: 'test' } })
  })

  it('API 响应应支持自定义头', () => {
    const route = {
      pattern: '/custom',
      filePath: 'custom.ts',
      params: [],
      isCatchAll: false,
      methods: ['GET'],
      handler: () => ({
        status: 200,
        headers: { 'X-Custom': 'value' },
        body: {},
      }),
    }

    const response = handleApiRequest(route, {
      method: 'GET', path: '/custom', params: {}, query: {}, headers: {}, body: null,
    })
    expect(response.headers).toEqual({ 'X-Custom': 'value' })
  })

  it('API 响应应支持 JSON body', () => {
    const route = {
      pattern: '/json',
      filePath: 'json.ts',
      params: [],
      isCatchAll: false,
      methods: ['GET'],
      handler: () => ({
        status: 200,
        body: { items: [1, 2, 3], meta: { total: 3 } },
      }),
    }

    const response = handleApiRequest(route, {
      method: 'GET', path: '/json', params: {}, query: {}, headers: {}, body: null,
    })
    expect(response.body).toEqual({ items: [1, 2, 3], meta: { total: 3 } })
  })
})

// ================================================================
//  查询字符串解析测试
// ================================================================

describe('LytX - 查询字符串解析', () => {
  const { parseQueryString } = require('../src/api-routes')

  it('应解析简单查询参数', () => {
    const query = parseQueryString('foo=bar&baz=qux')
    expect(query).toEqual({ foo: 'bar', baz: 'qux' })
  })

  it('应解析空查询字符串', () => {
    const query = parseQueryString('')
    expect(query).toEqual({})
  })

  it('应解析 URL 编码的值', () => {
    const query = parseQueryString('name=hello%20world')
    expect(query).toEqual({ name: 'hello world' })
  })
})

// ================================================================
//  中间件执行测试
// ================================================================

describe('LytX - 中间件执行', () => {
  const {
    corsMiddleware,
    loggerMiddleware,
    bodyParserMiddleware,
    authMiddleware,
    rateLimitMiddleware,
    executeMiddlewareChain,
    resolveMiddlewares,
    clearMiddlewareState,
    logStore,
  } = require('../src/middleware')

  beforeEach(() => {
    clearMiddlewareState()
  })

  it('CORS 中间件应添加跨域头', async () => {
    const request = {
      method: 'GET', path: '/api/hello', params: {}, query: {}, headers: {}, body: null,
    }

    const response = await executeMiddlewareChain(
      [corsMiddleware],
      request,
      () => ({ status: 200, body: { ok: true } }),
    )

    expect(response.headers['Access-Control-Allow-Origin']).toBe('*')
    expect(response.headers['Access-Control-Allow-Methods']).toBeDefined()
    expect(response.body).toEqual({ ok: true })
  })

  it('CORS 中间件应处理 OPTIONS 预检请求', async () => {
    const request = {
      method: 'OPTIONS', path: '/api/hello', params: {}, query: {}, headers: {}, body: null,
    }

    const response = await executeMiddlewareChain(
      [corsMiddleware],
      request,
      () => ({ status: 200, body: { should: 'not reach' } }),
    )

    expect(response.status).toBe(204)
    expect(response.body).toBeNull()
  })

  it('Logger 中间件应记录请求日志', async () => {
    const request = {
      method: 'GET', path: '/api/test', params: {}, query: {}, headers: {}, body: null,
    }

    await executeMiddlewareChain(
      [loggerMiddleware],
      request,
      () => ({ status: 200, body: {} }),
    )

    expect(logStore.length).toBe(1)
    expect(logStore[0].method).toBe('GET')
    expect(logStore[0].path).toBe('/api/test')
    expect(logStore[0].status).toBe(200)
  })

  it('Body Parser 中间件应解析 JSON body', async () => {
    const request = {
      method: 'POST', path: '/api/data', params: {}, query: {}, headers: { 'content-type': 'application/json' }, body: '{"name":"test"}',
    }

    await executeMiddlewareChain(
      [bodyParserMiddleware],
      request,
      () => ({ status: 200, body: { parsed: request.body } }),
    )

    // body 应被解析为对象
    expect(typeof request.body).toBe('object')
  })

  it('Auth 中间件应通过有 Authorization 头的请求', async () => {
    const request = {
      method: 'GET', path: '/api/admin', params: {}, query: {}, headers: { 'authorization': 'Bearer token' }, body: null,
    }

    const response = await executeMiddlewareChain(
      [authMiddleware],
      request,
      () => ({ status: 200, body: { secret: 'data' } }),
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ secret: 'data' })
  })

  it('Auth 中间件应拒绝无 Authorization 头的请求', async () => {
    const request = {
      method: 'GET', path: '/api/admin', params: {}, query: {}, headers: {}, body: null,
    }

    const response = await executeMiddlewareChain(
      [authMiddleware],
      request,
      () => ({ status: 200, body: { should: 'not reach' } }),
    )

    expect(response.status).toBe(401)
    expect(response.body.error).toBe('Unauthorized')
  })

  it('Rate Limit 中间件应允许正常请求', async () => {
    const request = {
      method: 'GET', path: '/api/data', params: {}, query: {}, headers: { 'x-real-ip': '127.0.0.1' }, body: null,
    }

    const response = await executeMiddlewareChain(
      [rateLimitMiddleware],
      request,
      () => ({ status: 200, body: {} }),
    )

    expect(response.status).toBe(200)
    expect(response.headers['X-RateLimit-Limit']).toBeDefined()
    expect(response.headers['X-RateLimit-Remaining']).toBeDefined()
  })

  it('Rate Limit 中间件应拒绝超限请求', async () => {
    const request = {
      method: 'GET', path: '/api/data', params: {}, query: {}, headers: { 'x-real-ip': '10.0.0.1' }, body: null,
    }

    // 使用极小的限制进行测试
    const { createRateLimitMiddleware } = require('../src/middleware')
    const strictLimiter = createRateLimitMiddleware({ windowMs: 60000, maxRequests: 2 })

    // 前两次请求应通过
    const r1 = await executeMiddlewareChain([strictLimiter], request, () => ({ status: 200, body: {} }))
    expect(r1.status).toBe(200)

    const r2 = await executeMiddlewareChain([strictLimiter], request, () => ({ status: 200, body: {} }))
    expect(r2.status).toBe(200)

    // 第三次请求应被拒绝
    const r3 = await executeMiddlewareChain([strictLimiter], request, () => ({ status: 200, body: {} }))
    expect(r3.status).toBe(429)
    expect(r3.body.error).toBe('Too Many Requests')
  })

  it('中间件应按顺序执行', async () => {
    const order: string[] = []

    const mw1 = {
      name: 'mw1',
      execute(ctx: any, next: () => void) {
        order.push('mw1-before')
        next()
        order.push('mw1-after')
      },
    }

    const mw2 = {
      name: 'mw2',
      execute(ctx: any, next: () => void) {
        order.push('mw2-before')
        next()
        order.push('mw2-after')
      },
    }

    await executeMiddlewareChain(
      [mw1, mw2],
      { method: 'GET', path: '/', params: {}, query: {}, headers: {}, body: null },
      () => { order.push('handler') },
    )

    expect(order).toEqual(['mw1-before', 'mw2-before', 'handler', 'mw2-after', 'mw1-after'])
  })

  it('中间件不调用 next() 应终止链', async () => {
    const order: string[] = []

    const blockingMw = {
      name: 'blocking',
      execute(ctx: any, next: () => void) {
        order.push('blocking')
        ctx.response.status = 403
        ctx.response.body = { error: 'Forbidden' }
        ctx.terminated = true
      },
    }

    const neverReached = {
      name: 'never',
      execute(ctx: any, next: () => void) {
        order.push('never')
        next()
      },
    }

    const response = await executeMiddlewareChain(
      [blockingMw, neverReached],
      { method: 'GET', path: '/', params: {}, query: {}, headers: {}, body: null },
      () => { order.push('handler') },
    )

    expect(order).toEqual(['blocking'])
    expect(response.status).toBe(403)
    expect(response.body).toEqual({ error: 'Forbidden' })
  })
})

// ================================================================
//  中间件配置解析测试
// ================================================================

describe('LytX - 中间件配置解析', () => {
  const { resolveMiddlewares, getMiddleware, getRegisteredMiddlewareNames, registerMiddleware } = require('../src/middleware')

  it('全局中间件配置应应用于所有路径', () => {
    const config = {
      global: ['logger', 'cors'],
    }

    const mws1 = resolveMiddlewares(config, '/api/hello')
    expect(mws1.length).toBe(2)
    expect(mws1[0].name).toBe('logger')
    expect(mws1[1].name).toBe('cors')

    const mws2 = resolveMiddlewares(config, '/api/users/123')
    expect(mws2.length).toBe(2)
  })

  it('路径特定中间件应仅应用于匹配路径', () => {
    const config = {
      global: ['logger'],
      '/api/admin': ['auth'],
    }

    const adminMws = resolveMiddlewares(config, '/api/admin/users')
    expect(adminMws.length).toBe(2)
    expect(adminMws.find((m: any) => m.name === 'auth')).toBeDefined()

    const normalMws = resolveMiddlewares(config, '/api/hello')
    expect(normalMws.length).toBe(1)
    expect(normalMws[0].name).toBe('logger')
  })

  it('路径精确匹配应应用中间件', () => {
    const config = {
      '/api/admin': ['auth'],
    }

    const mws = resolveMiddlewares(config, '/api/admin')
    expect(mws.length).toBe(1)
    expect(mws[0].name).toBe('auth')
  })

  it('不应重复添加同名中间件', () => {
    const config = {
      global: ['logger'],
      '/api': ['logger'],
    }

    const mws = resolveMiddlewares(config, '/api/hello')
    const loggerCount = mws.filter((m: any) => m.name === 'logger').length
    expect(loggerCount).toBe(1)
  })

  it('未注册的中间件名称应被忽略', () => {
    const config = {
      global: ['nonexistent', 'logger'],
    }

    const mws = resolveMiddlewares(config, '/api/test')
    expect(mws.length).toBe(1)
    expect(mws[0].name).toBe('logger')
  })

  it('getMiddleware 应返回已注册的中间件', () => {
    const mw = getMiddleware('logger')
    expect(mw).not.toBeNull()
    expect(mw!.name).toBe('logger')
  })

  it('getMiddleware 对未注册名称应返回 null', () => {
    const mw = getMiddleware('nonexistent')
    expect(mw).toBeNull()
  })

  it('getRegisteredMiddlewareNames 应返回所有内置中间件', () => {
    const names = getRegisteredMiddlewareNames()
    expect(names).toContain('cors')
    expect(names).toContain('logger')
    expect(names).toContain('body-parser')
    expect(names).toContain('auth')
    expect(names).toContain('rate-limit')
  })

  it('registerMiddleware 应注册自定义中间件', () => {
    const customMw = { name: 'custom', execute() {} }
    registerMiddleware('custom', customMw)

    const mw = getMiddleware('custom')
    expect(mw).not.toBeNull()
    expect(mw!.name).toBe('custom')
  })
})

// ================================================================
//  配置加载测试（含 middleware 和 apiDir）
// ================================================================

describe('LytX - 配置加载（middleware 和 apiDir）', () => {
  const { getDefaultConfig, resolveConfig } = require('../src/config')

  it('默认配置应包含 apiDir', () => {
    const config = getDefaultConfig()
    expect(config.apiDir).toBe('src/pages/api')
  })

  it('默认配置应包含 middleware', () => {
    const config = getDefaultConfig()
    expect(config.middleware).toBeDefined()
    expect(config.middleware).toEqual({})
  })

  it('应正确合并自定义 apiDir', () => {
    const config = resolveConfig({ apiDir: 'api/routes' })
    expect(config.apiDir).toBe('api/routes')
  })

  it('应正确合并自定义 middleware 配置', () => {
    const config = resolveConfig({
      middleware: {
        global: ['logger', 'cors'],
        '/api/admin': ['auth'],
      },
    })
    expect(config.middleware.global).toEqual(['logger', 'cors'])
    expect(config.middleware['/api/admin']).toEqual(['auth'])
  })

  it('空 middleware 配置应使用默认值', () => {
    const config = resolveConfig({})
    expect(config.middleware).toEqual({})
  })
})

// ================================================================
//  API + 页面共存测试
// ================================================================

describe('LytX - API + 页面共存', () => {
  const { resolveRoutes } = require('../src/router')
  const { resolveApiRoutes } = require('../src/api-routes')
  const { matchRoute } = require('../src/router')
  const { matchApiRoute } = require('../src/api-routes')
  const fs = require('node:fs')
  const path = require('node:path')
  const os = require('node:os')

  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lytx-coexist-'))
  })

  it('API 路由和页面路由应能共存', () => {
    // 创建页面文件
    const pagesDir = path.join(tmpDir, 'src', 'pages')
    fs.mkdirSync(pagesDir, { recursive: true })
    fs.writeFileSync(path.join(pagesDir, 'index.ts'), '')
    fs.writeFileSync(path.join(pagesDir, 'about.ts'), '')

    // 创建 API 文件（在独立的 api 目录下，不在 pages 目录内）
    const apiDir = path.join(tmpDir, 'api')
    fs.mkdirSync(path.join(apiDir, 'users'), { recursive: true })
    fs.writeFileSync(path.join(apiDir, 'hello.ts'), '')
    fs.writeFileSync(path.join(apiDir, 'users', '[id].ts'), '')

    const pageRoutes = resolveRoutes(pagesDir)
    const apiRoutes = resolveApiRoutes(apiDir)

    // 页面路由只有 2 个（index 和 about）
    expect(pageRoutes.length).toBe(2)
    // API 路由有 2 个
    expect(apiRoutes.length).toBe(2)
  })

  it('API 404 应返回 null（由页面路由处理）', () => {
    const apiRoutes = resolveApiRoutes('/nonexistent')
    const result = matchApiRoute(apiRoutes, '/api/nonexistent', 'GET')
    expect(result).toBeNull()
  })
})
