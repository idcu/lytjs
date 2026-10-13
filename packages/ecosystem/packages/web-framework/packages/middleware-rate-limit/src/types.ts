/**
 * 限流中间件配置选项
 */
export interface RateLimitOptions {
  /** 时间窗口大小（毫秒） */
  windowMs: number;
  /** 时间窗口内最大请求数 */
  max: number;
  /**
   * 键生成函数，用于标识请求来源。
   *
   * 不传时使用默认实现：`ctx.clientIp` → `ctx.ip` → `ctx.socket.remoteAddress`
   * →（仅当 `trustProxy`）转发头 → **抛错**。
   */
  keyGenerator?: (request: unknown, ctx: unknown) => string;
  /**
   * 是否信任 `x-forwarded-for` / `x-real-ip` 等**客户端可伪造**的转发头。
   *
   * 默认 `false`。只有在反向代理之后、且该代理会**覆写**这些头时才应开启 ——
   * 否则客户端随手换个假 IP 即可绕过限流。
   */
  trustProxy?: boolean;
  /**
   * 最多保留多少个客户端键（超出按 LRU 淘汰）。默认 `10000`。
   * 不设上限时，伪造海量 key 可撑爆内存。
   */
  maxKeys?: number;
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
