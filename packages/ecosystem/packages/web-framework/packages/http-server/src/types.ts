/**
 * HTTP 服务器类型定义
 */

import type {
  HttpMethod,
  HttpContext,
  HttpRequest,
  HttpResponse,
  HttpRoute,
} from '@lytjs/shared-types';

export type { HttpMethod };
export type { HttpContext as Context };
export type { HttpRequest as Request };
export type { HttpResponse as Response };
export type { HttpRoute as Route };

/**
 * 请求处理器函数
 */
export type Handler = (ctx: Context) => Promise<void> | void;
