/**
 * LytX - 统一导出入口
 *
 * Lyt.js 元框架，支持 SSR/SSG/SPA 三种渲染模式。
 * 提供文件路由、布局系统、页面渲染等核心功能。
 */

// ================================================================
//  类型导出
// ================================================================

export type {
  LytXConfig,
  ResolvedLytXConfig,
  SiteConfig,
  BuildConfig,
  MiddlewareConfig,
  Route,
  RouteMatch,
  PageModule,
  LayoutModule,
  ComponentOptions,
  HeadConfig,
  RenderContext,
  SSGPage,
  SPAManifest,
  SPAManifestEntry,
  CLICommand,
  ParsedCLIArgs,
} from './types'

// ================================================================
//  配置模块
// ================================================================

export {
  loadConfig,
  getDefaultConfig,
  resolveConfig,
} from './config'

// ================================================================
//  路由模块
// ================================================================

export {
  resolveRoutes,
  matchRoute,
  parseFilePath,
} from './router'

// ================================================================
//  加载器模块
// ================================================================

export {
  loadPage,
  loadLayout,
  clearCache,
  createPageModule,
  createLayoutModule,
} from './loader'

// ================================================================
//  布局模块
// ================================================================

export {
  loadLayoutModule,
  resolveLayout,
  applyLayout,
  createDefaultLayout,
} from './layout'

// ================================================================
//  渲染器模块
// ================================================================

export {
  renderPage,
  renderPageWithModules,
  buildStatic,
  buildSPA,
  simpleRenderToString,
  generateHTMLDocument,
} from './renderer'

// ================================================================
//  CLI 模块
// ================================================================

export {
  parseArgs,
  startDevServer,
  build,
  startPreviewServer,
} from './cli'

// ================================================================
//  API 路由模块
// ================================================================

export {
  resolveApiRoutes,
  matchApiRoute,
  handleApiRequest,
  parseQueryString,
  parseApiFilePath,
} from './api-routes'

export type {
  ApiRequest,
  ApiResponse,
  ApiRoute,
  ApiRouteMatch,
  ApiHandler,
  ApiMethodHandlers,
} from './api-routes'

// ================================================================
//  迁移模块
// ================================================================

export {
  runMigrate,
  parseMigrateArgs,
} from './migrate'

export type {
  MigrateOptions,
  MigrateResult,
  FileMigrateReport,
} from './migrate'

// ================================================================
//  中间件模块
// ================================================================

export {
  corsMiddleware,
  loggerMiddleware,
  bodyParserMiddleware,
  authMiddleware,
  rateLimitMiddleware,
  createCorsMiddleware,
  createLoggerMiddleware,
  createBodyParserMiddleware,
  createAuthMiddleware,
  createRateLimitMiddleware,
  registerMiddleware,
  getMiddleware,
  getRegisteredMiddlewareNames,
  executeMiddlewareChain,
  resolveMiddlewares,
  clearMiddlewareState,
} from './middleware'

export type {
  Middleware,
  MiddlewareContext,
  MiddlewareConfig as MiddlewareConfigType,
  CorsOptions,
  AuthOptions,
  RateLimitOptions,
  LogEntry,
} from './middleware'
