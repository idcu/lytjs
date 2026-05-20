/**
 * HTTP 服务器类型定义
 * @deprecated 请使用 @lytjs/shared-types 中的类型
 */

// 从共享类型导入并重新导出
export type {
  HttpMethod,
  HttpContext as Context,
  HttpRequest as Request,
  HttpResponse as Response,
  HttpRoute as Route,
} from '@lytjs/shared-types';

/**
 * 请求处理器函数
 */
export type Handler = (ctx: Context) => Promise<void> | void;
