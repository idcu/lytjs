/**
 * CORS 中间件选项类型
 */

/**
 * CORS 中间件选项
 */
export interface CORSOptions {
  /**
   * 允许的来源
   * - 字符串：单个 origin
   * - 数组：多个 origin
   * - 正则：匹配 origin
   * - 布尔值：true 允许所有，false 不允许
   * - 函数：自定义判断
   */
  origin?: string | string[] | RegExp | boolean | ((origin: string | null) => boolean | string);
  
  /**
   * 允许的 HTTP 方法
   */
  methods?: string | string[];
  
  /**
   * 允许的请求头
   */
  allowedHeaders?: string | string[];
  
  /**
   * 暴露的响应头
   */
  exposedHeaders?: string | string[];
  
  /**
   * 是否允许携带凭证
   */
  credentials?: boolean;
  
  /**
   * 预检请求缓存时间（秒）
   */
  maxAge?: number;
}
