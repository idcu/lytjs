#!/usr/bin/env node
/**
 * LytX - CLI 命令行工具
 *
 * 提供 dev、build、preview 三个核心命令。
 * 使用 Node.js 内置 http 模块实现开发服务器。
 *
 * 用法：
 *   lytx dev [rootDir]       - 启动开发服务器
 *   lytx build [rootDir]     - 构建生产版本
 *   lytx preview [rootDir]   - 预览生产构建
 *
 * 纯原生零依赖实现。
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as http from 'node:http'
import type { ParsedCLIArgs, ResolvedLytXConfig } from './types'
import { loadConfig } from './config'
import { resolveRoutes, matchRoute } from './router'
import { renderPage } from './renderer'
import { resolveApiRoutes, matchApiRoute, handleApiRequest, parseQueryString } from './api-routes'
import type { ApiRequest, ApiRoute } from './api-routes'
import { resolveMiddlewares, executeMiddlewareChain } from './middleware'
import type { MiddlewareConfig } from './types'

// ================================================================
//  CLI 参数解析
// ================================================================

/**
 * 解析命令行参数
 *
 * @param args 命令行参数数组（process.argv.slice(2)）
 * @returns 解析后的 CLI 参数
 */
export function parseArgs(args: string[]): ParsedCLIArgs {
  const command = (args[0] || 'dev') as ParsedCLIArgs['command']
  let rootDir = args[1] || process.cwd()
  let port: number | undefined
  let host: string | undefined

  // 解析选项参数
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      port = parseInt(args[i + 1], 10)
      i++
    } else if (args[i] === '--host' && args[i + 1]) {
      host = args[i + 1]
      i++
    }
  }

  // 转换为绝对路径
  rootDir = path.resolve(rootDir)

  return { command, rootDir, port, host }
}

// ================================================================
//  开发服务器
// ================================================================

/**
 * 启动开发服务器
 *
 * @param rootDir 项目根目录
 * @param port 端口号
 * @param host 主机名
 */
export async function startDevServer(
  rootDir: string,
  port: number = 3000,
  host: string = 'localhost',
): Promise<void> {
  // 加载配置
  const config = await loadConfig(rootDir)
  const pagesDir = path.join(rootDir, config.pagesDir)
  const apiDir = path.join(rootDir, config.apiDir)

  // 解析路由
  let routes = resolveRoutes(pagesDir)
  console.log(`[LytX] 已解析 ${routes.length} 个路由`)

  // 打印路由表
  for (const route of routes) {
    console.log(`  ${route.path} → ${route.filePath}`)
  }

  // 解析 API 路由
  let apiRoutes = resolveApiRoutes(apiDir)
  console.log(`[LytX] 已解析 ${apiRoutes.length} 个 API 路由`)

  for (const apiRoute of apiRoutes) {
    console.log(`  API ${apiRoute.pattern} → ${apiRoute.filePath}`)
  }

  // 创建 HTTP 服务器
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${host}:${port}`)
    const pathname = url.pathname
    const method = (req.method || 'GET').toUpperCase()

    // 移除 base 路径前缀
    const cleanPath = config.base !== '/'
      ? pathname.replace(new RegExp(`^${config.base.replace(/\//g, '\\/')}`), '') || '/'
      : pathname

    try {
      // 尝试匹配 API 路由
      const apiMatch = matchApiRoute(apiRoutes, cleanPath, method)

      if (apiMatch) {
        // 构建 API 请求对象
        const apiRequest: ApiRequest = {
          method,
          path: cleanPath,
          params: apiMatch.params,
          query: parseQueryString(url.search.slice(1)),
          headers: req.headers as Record<string, string>,
          body: null,
        }

        // 解析中间件
        const middlewares = resolveMiddlewares(config.middleware, cleanPath)

        // 执行中间件链和 API 处理器
        const apiResponse = await executeMiddlewareChain(
          middlewares,
          apiRequest,
          () => handleApiRequest(apiMatch.route, apiRequest),
        )

        // 发送响应
        const statusCode = apiResponse.status || 200
        const headers: Record<string, string> = {
          'Content-Type': 'application/json; charset=utf-8',
          ...(apiResponse.headers || {}),
        }
        res.writeHead(statusCode, headers)
        res.end(apiResponse.body != null ? JSON.stringify(apiResponse.body) : '')
        return
      }

      // 匹配页面路由
      const match = matchRoute(routes, cleanPath)

      if (match) {
        // SSR 渲染
        const html = await renderPage(match.route, match.params, config, rootDir)
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(html)
      } else {
        // 404
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end('<h1>404 - Page Not Found</h1>')
      }
    } catch (err: any) {
      console.error(`[LytX] 渲染错误: ${err.message}`)
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(`<h1>500 - Internal Server Error</h1><pre>${err.message}</pre>`)
    }
  })

  // 启动服务器
  server.listen(port, host, () => {
    console.log(`\n[LytX] 开发服务器已启动`)
    console.log(`  本地地址: http://${host}:${port}`)
    console.log(`  基础路径: ${config.base}`)
    console.log(`  渲染模式: SSR (开发模式)\n`)
  })

  // 文件监听（简单的轮询方式）
  let lastRoutes = routes
  const watchInterval = setInterval(() => {
    const newRoutes = resolveRoutes(pagesDir)
    if (newRoutes.length !== lastRoutes.length ||
        JSON.stringify(newRoutes.map(r => r.path)) !== JSON.stringify(lastRoutes.map(r => r.path))) {
      routes = newRoutes
      lastRoutes = newRoutes
      console.log(`[LytX] 路由已更新: ${routes.length} 个路由`)
    }
  }, 2000)

  // 优雅关闭
  process.on('SIGINT', () => {
    clearInterval(watchInterval)
    server.close(() => {
      console.log('\n[LytX] 开发服务器已关闭')
      process.exit(0)
    })
  })
}

// ================================================================
//  生产构建
// ================================================================

/**
 * 执行生产构建
 *
 * @param rootDir 项目根目录
 */
export async function build(rootDir: string): Promise<void> {
  console.log('[LytX] 开始构建...\n')

  // 加载配置
  const config = await loadConfig(rootDir)
  const pagesDir = path.join(rootDir, config.pagesDir)
  const apiDir = path.join(rootDir, config.apiDir)

  // 解析路由
  const routes = resolveRoutes(pagesDir)
  console.log(`[LytX] 已解析 ${routes.length} 个路由`)

  // 解析 API 路由
  const apiRoutes = resolveApiRoutes(apiDir)
  console.log(`[LytX] 已解析 ${apiRoutes.length} 个 API 路由`)

  // 根据模式构建
  switch (config.mode) {
    case 'ssg': {
      console.log('[LytX] 模式: SSG (静态站点生成)')
      const { buildStatic } = await import('./renderer')
      const pages = await buildStatic(routes, config, rootDir)
      console.log(`[LytX] 已生成 ${pages.length} 个静态页面`)
      console.log(`[LytX] 输出目录: ${path.join(rootDir, config.outDir)}`)
      break
    }
    case 'ssr': {
      console.log('[LytX] 模式: SSR (服务端渲染)')
      console.log(`[LytX] API 路由: ${apiRoutes.length} 个`)
      console.log('[LytX] SSR 模式需要部署 Node.js 服务器')
      console.log(`[LytX] 输出目录: ${path.join(rootDir, config.outDir)}`)
      break
    }
    case 'spa': {
      console.log('[LytX] 模式: SPA (单页应用)')
      const { buildSPA } = await import('./renderer')
      const manifest = await buildSPA(routes, config, rootDir)
      console.log(`[LytX] 已生成 SPA 清单 (${manifest.routes.length} 个路由)`)
      console.log(`[LytX] 输出目录: ${path.join(rootDir, config.outDir)}`)
      break
    }
  }

  console.log('\n[LytX] 构建完成!')
}

// ================================================================
//  预览服务器
// ================================================================

/**
 * 启动预览服务器（提供静态文件服务）
 *
 * @param rootDir 项目根目录
 * @param port 端口号
 * @param host 主机名
 */
export async function startPreviewServer(
  rootDir: string,
  port: number = 4173,
  host: string = 'localhost',
): Promise<void> {
  // 加载配置获取 outDir
  const config = await loadConfig(rootDir)
  const outDir = path.join(rootDir, config.outDir)

  if (!fs.existsSync(outDir)) {
    console.error(`[LytX] 输出目录不存在: ${outDir}`)
    console.error('[LytX] 请先运行 lytx build')
    process.exit(1)
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${host}:${port}`)
    let filePath = path.join(outDir, url.pathname)

    // 默认请求 index.html
    if (url.pathname === '/' || !fs.existsSync(filePath)) {
      filePath = path.join(outDir, 'index.html')
    }

    // 安全检查：防止路径遍历
    const resolvedPath = path.resolve(filePath)
    if (!resolvedPath.startsWith(path.resolve(outDir))) {
      res.writeHead(403, { 'Content-Type': 'text/plain' })
      res.end('403 Forbidden')
      return
    }

    // 读取文件
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
      const ext = path.extname(resolvedPath)
      const contentTypes: Record<string, string> = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
      }

      const contentType = contentTypes[ext] || 'application/octet-stream'
      const content = fs.readFileSync(resolvedPath)

      res.writeHead(200, { 'Content-Type': contentType })
      res.end(content)
    } else {
      // 尝试 404.html
      const notFoundPath = path.join(outDir, '404.html')
      if (fs.existsSync(notFoundPath)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(fs.readFileSync(notFoundPath))
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('404 Not Found')
      }
    }
  })

  server.listen(port, host, () => {
    console.log(`\n[LytX] 预览服务器已启动`)
    console.log(`  本地地址: http://${host}:${port}`)
    console.log(`  输出目录: ${outDir}\n`)
  })
}

// ================================================================
//  CLI 入口
// ================================================================

/**
 * CLI 主函数
 *
 * @param args 命令行参数
 */
async function main(args: string[]): Promise<void> {
  const parsed = parseArgs(args)

  switch (parsed.command) {
    case 'dev':
      await startDevServer(parsed.rootDir, parsed.port || 3000, parsed.host || 'localhost')
      break
    case 'build':
      await build(parsed.rootDir)
      break
    case 'preview':
      await startPreviewServer(parsed.rootDir, parsed.port || 4173, parsed.host || 'localhost')
      break
    default:
      console.error(`[LytX] 未知命令: ${parsed.command}`)
      console.error('[LytX] 可用命令: dev, build, preview')
      process.exit(1)
  }
}

// 直接运行时执行 CLI
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('cli.ts') ||
  process.argv[1].endsWith('cli.js')
)

if (isDirectRun) {
  main(process.argv.slice(2)).catch((err) => {
    console.error('[LytX] CLI 错误:', err)
    process.exit(1)
  })
}
