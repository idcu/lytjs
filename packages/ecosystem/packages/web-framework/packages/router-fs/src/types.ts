/**
 * @lytjs/router-fs - 类型定义
 */

/** 路由配置接口 */
export interface RouteConfig {
  /** 路由路径 */
  path: string;
  /** 路由名称 */
  name?: string;
  /** 组件路径 */
  componentPath: string;
  /** 是否为动态路由 */
  isDynamic: boolean;
  /** 动态路由参数名 */
  params?: string[];
  /** 是否为嵌套路由 */
  isNested: boolean;
  /** 子路由 */
  children?: RouteConfig[];
  /** 布局路径 */
  layoutPath?: string;
}

/** 文件系统路由配置选项 */
export interface FileSystemRouterOptions {
  /** 页面目录路径 */
  pagesDir: string;
  /** 页面文件扩展名 */
  extensions?: string[];
  /** 布局文件名称模式 */
  layoutPattern?: string;
  /** 忽略文件模式 */
  ignorePatterns?: string[];
  /** 是否启用严格模式 */
  strictMode?: boolean;
}

/** 路由匹配结果 */
export interface RouteMatch {
  /** 匹配的路由配置 */
  route: RouteConfig;
  /** 路由参数 */
  params: Record<string, string>;
  /** 路由路径 */
  path: string;
}

/** 路由管理器接口 */
export interface FileSystemRouter {
  /** 获取路由配置列表 */
  getRoutes(): RouteConfig[];

  /** 匹配路径 */
  match(path: string): RouteMatch | null;

  /** 添加路由 */
  addRoute(route: RouteConfig): void;

  /** 移除路由 */
  removeRoute(path: string): void;

  /** 清除所有路由 */
  clearRoutes(): void;

  /** 重新扫描文件系统 */
  refresh(): Promise<void>;
}
