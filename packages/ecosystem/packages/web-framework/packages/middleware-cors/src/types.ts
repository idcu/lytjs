/**
 * CORS 中间件类型
 */

export interface CorsConfig {
  /** 允许的源 - 字符串或数组，或 true 表示镜像请求源 */
  origin?: string | string[] | boolean;
  /** 允许的方法 */
  methods?: string[];
  /** 允许的请求头 */
  allowedHeaders?: string[];
  /** 暴露的响应头 */
  exposedHeaders?: string[];
  /** 允许凭证 */
  credentials?: boolean;
  /** 预检请求的最大缓存时间 */
  maxAge?: number;
  /** 预检响应的状态码 */
  preflightStatus?: number;
}
