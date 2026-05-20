/**
 * 限流中间件配置选项
 */
export interface RateLimitOptions {
  /** 时间窗口大小（毫秒） */
  windowMs: number;
  /** 时间窗口内最大请求数 */
  max: number;
  /** 键生成函数，用于标识请求来源 */
  keyGenerator?: (request: Request, ctx: any) => string;
}

/**
 * 限流信息
 */
export interface RateLimitInfo {
  /** 剩余请求数 */
  remaining: number;
  /** 重置时间戳（毫秒） */
  reset: number;
  /** 限制总数 */
  limit: number;
}
