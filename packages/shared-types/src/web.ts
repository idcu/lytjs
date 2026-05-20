/**
 * Web 相关通用类型定义
 */

/**
 * HTTP 方法类型
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

/**
 * 元数据类型
 */
export interface Metadata {
  /** 页面标题 */
  title?: string;
  /** 页面描述 */
  description?: string;
  /** 关键词 */
  keywords?: string[];
  /** Open Graph 元数据 */
  openGraph?: OpenGraphMetadata;
  /** Twitter 元数据 */
  twitter?: TwitterMetadata;
  /** 其他自定义元数据 */
  [key: string]: unknown;
}

/**
 * Open Graph 元数据
 */
export interface OpenGraphMetadata {
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 图片 */
  image?: string;
  /** URL */
  url?: string;
  /** 类型 */
  type?: string;
  /** 其他自定义属性 */
  [key: string]: unknown;
}

/**
 * Twitter 元数据
 */
export interface TwitterMetadata {
  /** 卡片类型 */
  card?: string;
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 图片 */
  image?: string;
  /** 其他自定义属性 */
  [key: string]: unknown;
}

/**
 * HTTP 请求上下文
 */
export interface HttpContext {
  /** 请求对象 */
  request: HttpRequest;
  /** 响应对象 */
  response?: HttpResponse;
  /** 额外的上下文属性 */
  [key: string]: unknown;
}

/**
 * HTTP 请求对象
 */
export interface HttpRequest {
  /** HTTP 方法 */
  method: HttpMethod;
  /** 完整 URL */
  url: string;
  /** 路径 */
  path: string;
  /** 请求头 */
  headers: Record<string, string | string[] | undefined>;
  /** 请求体 */
  body?: unknown;
  /** 查询参数 */
  query: Record<string, string | string[]>;
  /** 路由参数 */
  params: Record<string, string>;
  /** 客户端 IP */
  ip?: string;
}

/**
 * HTTP 响应对象
 */
export interface HttpResponse {
  /** 状态码 */
  status: number;
  /** 响应头 */
  headers: Record<string, string | string[]>;
  /** 响应体 */
  body?: unknown;
}

/**
 * HTTP 路由定义
 */
export interface HttpRoute {
  /** HTTP 方法 */
  method: HttpMethod;
  /** 路由路径 */
  path: string;
  /** 处理器函数 */
  handler: (ctx: HttpContext) => Promise<void> | void;
}
