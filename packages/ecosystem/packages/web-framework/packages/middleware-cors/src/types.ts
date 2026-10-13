/**
 * CORS 中间件类型
 */

export interface CorsConfig {
  /**
   * 允许的源：
   * - 字符串（`'https://a.com'`）或数组（白名单）
   * - `'*'`：任意源。**不可与 `credentials: true` 共用**（构造时抛错）
   * - `true`：镜像请求的 `Origin`。**不可与 `credentials: true` 共用**（构造时抛错）
   * - 判定函数 `(origin) => boolean`：动态白名单
   */
  origin?: string | string[] | boolean | ((origin: string) => boolean);
  /** 允许的方法 */
  methods?: string[];
  /** 允许的请求头 */
  allowedHeaders?: string[];
  /** 暴露的响应头 */
  exposedHeaders?: string[];
  /**
   * 允许携带凭证（Cookie / Authorization）。
   * ⚠️ 开启时必须配**显式白名单**（字符串 / 数组 / 判定函数）；
   * 搭配 `origin: '*'` 或 `origin: true` 会在创建中间件时抛错。
   */
  credentials?: boolean;
  /** 预检请求的最大缓存时间 */
  maxAge?: number;
  /** 预检响应的状态码 */
  preflightStatus?: number;
}
