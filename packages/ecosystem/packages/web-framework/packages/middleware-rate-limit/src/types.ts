export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (ctx: any) => string;
}

export interface RateLimitInfo {
  remaining: number;
  reset: number;
  limit: number;
}
