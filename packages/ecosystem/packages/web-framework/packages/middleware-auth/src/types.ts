/**
 * 认证用户类型
 */
export interface AuthUser {
  /** 用户 ID */
  id: string | number;
  /** 其他用户属性 */
  [key: string]: unknown;
}

/**
 * 认证中间件配置选项
 */
export interface AuthOptions {
  /** 认证函数，接收 token 返回用户信息或 null */
  authenticate: (token: string) => Promise<AuthUser | null>;
  /** 认证头名称，默认为 Authorization */
  headerName?: string;
}
