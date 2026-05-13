/**
 * @lytjs/plugin-auth - 类型定义
 */

export interface User {
  /** 用户 ID */
  id: string | number;
  /** 用户名 */
  username?: string;
  /** 角色列表 */
  roles: string[];
  /** 权限列表 */
  permissions: string[];
  /** 附加数据 */
  [key: string]: unknown;
}

export interface AuthOptions {
  /** 初始用户 */
  initialUser?: User | null;
  /** 持久化 key */
  storageKey?: string;
  /** 是否启用持久化 */
  enablePersistence?: boolean;
  /** 超级管理员角色 */
  superAdminRole?: string;
}

export interface AuthInstance {
  /** 当前用户 */
  user: User | null;
  /** 是否已登录 */
  isAuthenticated: boolean;
  /** 登录 */
  login: (user: User) => void;
  /** 登出 */
  logout: () => void;
  /** 检查角色 */
  hasRole: (role: string | string[]) => boolean;
  /** 检查权限 */
  hasPermission: (permission: string | string[]) => boolean;
  /** 检查所有角色 */
  hasAllRoles: (roles: string[]) => boolean;
  /** 检查所有权限 */
  hasAllPermissions: (permissions: string[]) => boolean;
  /** 更新用户信息 */
  updateUser: (user: Partial<User>) => void;
}
