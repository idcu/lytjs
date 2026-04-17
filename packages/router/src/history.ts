/**
 * Lyt.js 路由系统 — History 管理
 *
 * 提供两种路由模式：
 * 1. HTML5 History 模式（createWebHistory）：使用 pushState/replaceState API
 * 2. Hash 模式（createHashHistory）：使用 URL hash（#）部分
 *
 * 两种模式都提供统一的 API：
 * - push(path) / replace(path) / go(n) / back() / forward()
 * - 监听 URL 变化事件
 * - 获取当前路由信息
 *
 * 纯原生零依赖实现。
 */

// ============================================================
// 类型定义
// ============================================================

/** 路由位置信息 */
export interface RouterLocation {
  /** 当前路径 */
  path: string;
  /** 完整 URL（含 hash） */
  fullPath: string;
  /** URL 查询参数对象 */
  query: Record<string, string>;
  /** URL hash 值（不含 #） */
  hash: string;
  /** 路由状态（通过 pushState 传入的 state） */
  state: any;
  /** 是否来自浏览器前进/后退操作 */
  fromPopState: boolean;
}

/** History 变化监听回调 */
export type HistoryChangeListener = (
  location: RouterLocation,
  from: RouterLocation
) => void;

/** History 实例接口 */
export interface RouterHistory {
  /** 基础路径（History 模式下使用） */
  base: string;
  /** 当前位置信息 */
  location: RouterLocation;
  /** 导航到新路径（新增历史记录） */
  push(path: string, state?: any): void;
  /** 替换当前路径（不新增历史记录） */
  replace(path: string, state?: any): void;
  /** 前进/后退 n 步 */
  go(n: number): void;
  /** 后退一步 */
  back(): void;
  /** 前进一步 */
  forward(): void;
  /** 获取当前路由位置 */
  getCurrentRoute(): RouterLocation;
  /** 监听路由变化 */
  listen(callback: HistoryChangeListener): () => void;
  /** 销毁 History 实例，移除事件监听 */
  destroy(): void;
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 解析 URL 查询参数
 *
 * @param search - 查询字符串（含 ?）
 * @returns 查询参数对象
 */
function parseQuery(search: string): Record<string, string> {
  const query: Record<string, string> = {};

  if (!search || search === '?') {
    return query;
  }

  // 去掉开头的 ?
  const queryString = search.startsWith('?') ? search.slice(1) : search;

  // 按 & 分割参数
  const pairs = queryString.split('&');

  for (const pair of pairs) {
    // 按 = 分割键值
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) {
      // 没有 = 的情况：key 存在，值为空字符串
      query[decodeURIComponent(pair)] = '';
    } else {
      const key = decodeURIComponent(pair.slice(0, eqIndex));
      const value = decodeURIComponent(pair.slice(eqIndex + 1));
      query[key] = value;
    }
  }

  return query;
}

/**
 * 将查询参数对象序列化为查询字符串
 *
 * @param query - 查询参数对象
 * @returns 查询字符串（不含 ?）
 */
function stringifyQuery(query: Record<string, string>): string {
  const pairs: string[] = [];

  for (const key of Object.keys(query)) {
    const value = query[key];
    if (value !== undefined && value !== null) {
      pairs.push(
        encodeURIComponent(key) + '=' + encodeURIComponent(value)
      );
    }
  }

  return pairs.join('&');
}

/**
 * 解析完整路径为 path、query、hash
 *
 * @param fullPath - 完整路径，如 '/user?id=1#section'
 * @returns 分解后的 { path, query, hash }
 */
function parseFullPath(fullPath: string): {
  path: string;
  query: Record<string, string>;
  hash: string;
} {
  // 提取 hash 部分
  let hash = '';
  let withoutHash = fullPath;

  const hashIndex = fullPath.indexOf('#');
  if (hashIndex !== -1) {
    hash = fullPath.slice(hashIndex + 1);
    withoutHash = fullPath.slice(0, hashIndex);
  }

  // 提取 query 部分
  let path = withoutHash;
  let query: Record<string, string> = {};

  const queryIndex = withoutHash.indexOf('?');
  if (queryIndex !== -1) {
    path = withoutHash.slice(0, queryIndex);
    query = parseQuery(withoutHash.slice(queryIndex));
  }

  return { path, query, hash };
}

/**
 * 标准化路径
 * - 去除多余的 /
 * - 确保以 / 开头
 *
 * @param path - 原始路径
 * @returns 标准化后的路径
 */
function normalizePath(path: string): string {
  // 确保以 / 开头
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  // 去除多余的 /
  return path.replace(/\/+/g, '/');
}

// ============================================================
// HTML5 History 模式
// ============================================================

/**
 * 创建 HTML5 History 模式的路由管理器
 *
 * 使用浏览器原生的 history.pushState / history.replaceState API，
 * 配合 popstate 事件监听浏览器前进/后退操作。
 *
 * @param base - 应用基础路径（默认 '/'）
 * @returns History 实例
 *
 * @example
 * ```ts
 * const history = createWebHistory('/app')
 * history.push('/user/123')
 * history.back()
 * history.listen((to, from) => {
 *   console.log('路由变化:', from.path, '->', to.path)
 * })
 * ```
 */
export function createWebHistory(base: string = '/'): RouterHistory {
  // 标准化 base 路径
  const normalizedBase = normalizePath(base);

  // 路由变化监听器列表
  const listeners: HistoryChangeListener[] = [];

  // 当前位置
  let currentLocation: RouterLocation = resolveLocation(window.location.href);

  // popstate 事件处理函数（用于浏览器前进/后退）
  function onPopState(event: PopStateEvent): void {
    const newLocation = resolveLocation(window.location.href);
    newLocation.fromPopState = true;
    newLocation.state = event.state;

    const from = currentLocation;
    currentLocation = newLocation;

    // 通知所有监听器
    notifyListeners(newLocation, from);
  }

  /**
   * 根据完整 URL 解析路由位置
   */
  function resolveLocation(url: string): RouterLocation {
    // 创建 URL 对象解析
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      // 如果 URL 解析失败（如相对路径），用 window.location 作为基准
      parsedUrl = new URL(url, window.location.origin);
    }

    // 获取去掉 base 后的路径
    let pathname = parsedUrl.pathname;

    // 如果 base 不是 '/'，需要去掉 base 前缀
    if (normalizedBase !== '/') {
      if (pathname.startsWith(normalizedBase)) {
        pathname = pathname.slice(normalizedBase.length) || '/';
      }
    }

    // 解析路径
    const { path, query, hash } = parseFullPath(pathname + parsedUrl.hash);

    return {
      path: normalizePath(path),
      fullPath: normalizePath(path) +
        (Object.keys(query).length ? '?' + stringifyQuery(query) : '') +
        (hash ? '#' + hash : ''),
      query,
      hash,
      state: (parsedUrl as any).state || null,
      fromPopState: false,
    };
  }

  /**
   * 通知所有监听器
   */
  function notifyListeners(to: RouterLocation, from: RouterLocation): void {
    for (const listener of listeners) {
      listener(to, from);
    }
  }

  // 注册 popstate 事件监听
  window.addEventListener('popstate', onPopState);

  return {
    base: normalizedBase,

    get location(): RouterLocation {
      return currentLocation;
    },

    /**
     * 导航到新路径（新增历史记录）
     */
    push(path: string, state?: any): void {
      const normalizedPath = normalizePath(path);
      const from = currentLocation;

      // 使用 pushState 推入新状态
      window.history.pushState(
        state || null,
        '',
        normalizedBase + normalizedPath
      );

      // 更新当前位置
      currentLocation = resolveLocation(window.location.href);
      currentLocation.state = state || null;

      // 通知监听器
      notifyListeners(currentLocation, from);
    },

    /**
     * 替换当前路径（不新增历史记录）
     */
    replace(path: string, state?: any): void {
      const normalizedPath = normalizePath(path);
      const from = currentLocation;

      // 使用 replaceState 替换当前状态
      window.history.replaceState(
        state || null,
        '',
        normalizedBase + normalizedPath
      );

      // 更新当前位置
      currentLocation = resolveLocation(window.location.href);
      currentLocation.state = state || null;

      // 通知监听器
      notifyListeners(currentLocation, from);
    },

    /**
     * 前进/后退 n 步
     */
    go(n: number): void {
      window.history.go(n);
    },

    /**
     * 后退一步
     */
    back(): void {
      window.history.back();
    },

    /**
     * 前进一步
     */
    forward(): void {
      window.history.forward();
    },

    /**
     * 获取当前路由位置
     */
    getCurrentRoute(): RouterLocation {
      return resolveLocation(window.location.href);
    },

    /**
     * 监听路由变化
     *
     * @param callback - 变化回调
     * @returns 取消监听的函数
     */
    listen(callback: HistoryChangeListener): () => void {
      listeners.push(callback);

      // 返回取消监听函数
      return () => {
        const index = listeners.indexOf(callback);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      };
    },

    /**
     * 销毁 History 实例
     * 移除 popstate 事件监听，清空监听器列表
     */
    destroy(): void {
      window.removeEventListener('popstate', onPopState);
      listeners.length = 0;
    },
  };
}

// ============================================================
// Hash History 模式
// ============================================================

/**
 * 创建 Hash 模式的路由管理器
 *
 * 使用 URL 的 hash 部分（#）作为路由路径。
 * 兼容性更好，不需要服务器端配置。
 *
 * 工作原理：
 * - 路由路径存储在 URL 的 hash 部分，如 http://example.com/#/user/123
 * - 通过 hashchange 事件监听 hash 变化
 * - 通过 location.hash 修改 hash
 *
 * @returns History 实例
 *
 * @example
 * ```ts
 * const history = createHashHistory()
 * history.push('/user/123')  // URL 变为 http://example.com/#/user/123
 * history.listen((to, from) => {
 *   console.log('hash 路由变化:', from.path, '->', to.path)
 * })
 * ```
 */
export function createHashHistory(): RouterHistory {
  // 路由变化监听器列表
  const listeners: HistoryChangeListener[] = [];

  // 当前位置
  let currentLocation: RouterLocation = resolveHashLocation();

  // hashchange 事件处理函数
  function onHashChange(): void {
    const newLocation = resolveHashLocation();
    newLocation.fromPopState = true;

    const from = currentLocation;
    currentLocation = newLocation;

    // 通知所有监听器
    notifyListeners(newLocation, from);
  }

  /**
   * 从当前 URL hash 解析路由位置
   */
  function resolveHashLocation(): RouterLocation {
    // 获取 hash 值（含 #）
    const hash = window.location.hash;

    // 去掉 # 号得到路由路径
    let hashPath = hash.slice(1) || '/';

    // 解析路径
    const { path, query, hash: fragment } = parseFullPath(hashPath);

    return {
      path: normalizePath(path),
      fullPath: normalizePath(path) +
        (Object.keys(query).length ? '?' + stringifyQuery(query) : '') +
        (fragment ? '#' + fragment : ''),
      query,
      hash: fragment,
      state: null,
      fromPopState: false,
    };
  }

  /**
   * 通知所有监听器
   */
  function notifyListeners(to: RouterLocation, from: RouterLocation): void {
    for (const listener of listeners) {
      listener(to, from);
    }
  }

  // 注册 hashchange 事件监听
  window.addEventListener('hashchange', onHashChange);

  return {
    base: '',

    get location(): RouterLocation {
      return currentLocation;
    },

    /**
     * 导航到新路径（新增历史记录）
     */
    push(path: string, state?: any): void {
      const normalizedPath = normalizePath(path);
      const from = currentLocation;

      // 修改 hash
      window.location.hash = normalizedPath;

      // 更新当前位置
      currentLocation = resolveHashLocation();

      // 通知监听器
      notifyListeners(currentLocation, from);
    },

    /**
     * 替换当前路径（不新增历史记录）
     */
    replace(path: string, state?: any): void {
      const normalizedPath = normalizePath(path);
      const from = currentLocation;

      // 使用 replace 替换 hash
      window.location.replace(
        window.location.pathname +
        window.location.search +
        '#' + normalizedPath
      );

      // 更新当前位置
      currentLocation = resolveHashLocation();

      // 通知监听器
      notifyListeners(currentLocation, from);
    },

    /**
     * 前进/后退 n 步
     */
    go(n: number): void {
      window.history.go(n);
    },

    /**
     * 后退一步
     */
    back(): void {
      window.history.back();
    },

    /**
     * 前进一步
     */
    forward(): void {
      window.history.forward();
    },

    /**
     * 获取当前路由位置
     */
    getCurrentRoute(): RouterLocation {
      return resolveHashLocation();
    },

    /**
     * 监听路由变化
     *
     * @param callback - 变化回调
     * @returns 取消监听的函数
     */
    listen(callback: HistoryChangeListener): () => void {
      listeners.push(callback);

      // 返回取消监听函数
      return () => {
        const index = listeners.indexOf(callback);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      };
    },

    /**
     * 销毁 History 实例
     * 移除 hashchange 事件监听，清空监听器列表
     */
    destroy(): void {
      window.removeEventListener('hashchange', onHashChange);
      listeners.length = 0;
    },
  };
}
