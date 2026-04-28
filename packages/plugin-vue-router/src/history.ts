/**
 * @lytjs/plugin-vue-router — RouterHistory 实现
 *
 * 提供三种路由历史管理模式：
 * 1. createWebHistory — HTML5 History API (pushState / replaceState)
 * 2. createWebHashHistory — URL Hash 模式 (location.hash)
 * 3. createMemoryHistory — 内存数组模式（适用于 SSR / 测试）
 *
 * 兼容 vue-router 4 的 RouterHistory 接口。
 */

// ============================================================
// 类型定义
// ============================================================

/** 路由位置信息 */
export interface RouterLocation {
  /** 当前路径 */
  path: string;
  /** 完整路径（含 query 和 hash） */
  fullPath: string;
  /** URL 查询参数对象 */
  query: Record<string, string>;
  /** URL hash 值（不含 #） */
  hash: string;
  /** 路由状态 */
  state: any;
  /** 是否来自浏览器前进/后退操作 */
  fromPopState: boolean;
}

/** History 变化监听回调 */
export type HistoryChangeListener = (
  location: RouterLocation,
  from: RouterLocation
) => void;

/** RouterHistory 接口（兼容 vue-router 4） */
export interface RouterHistory {
  /** 基础路径 */
  base: string;
  /** 当前位置 */
  location: RouterLocation;
  /** 当前状态 */
  state: any;
  /** 导航到新路径 */
  push(to: string, data?: any): void;
  /** 替换当前路径 */
  replace(to: string, data?: any): void;
  /** 前进/后退 n 步 */
  go(delta: number, triggerListeners?: boolean): void;
  /** 监听路由变化 */
  listen(callback: HistoryChangeListener): () => void;
  /** 销毁 History 实例 */
  destroy(): void;
  /** 设置当前位置（用于初始导航） */
  setLocation(location: RouterLocation): void;
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 解析 URL 查询参数
 */
function parseQuery(search: string): Record<string, string> {
  const query: Record<string, string> = {};
  if (!search || search === '?') return query;

  const queryString = search.startsWith('?') ? search.slice(1) : search;
  const pairs = queryString.split('&');

  for (const pair of pairs) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) {
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
 */
function stringifyQuery(query: Record<string, string>): string {
  const pairs: string[] = [];
  for (const key of Object.keys(query)) {
    const value = query[key];
    if (value !== undefined && value !== null) {
      pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    }
  }
  return pairs.join('&');
}

/**
 * 解析完整路径为 path、query、hash
 */
function parseFullPath(fullPath: string): {
  path: string;
  query: Record<string, string>;
  hash: string;
} {
  let hash = '';
  let withoutHash = fullPath;

  const hashIndex = fullPath.indexOf('#');
  if (hashIndex !== -1) {
    hash = fullPath.slice(hashIndex + 1);
    withoutHash = fullPath.slice(0, hashIndex);
  }

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
 */
function normalizePath(path: string): string {
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  return path.replace(/\/+/g, '/');
}

/**
 * 构建完整路径
 */
function buildFullPath(path: string, query: Record<string, string>, hash: string): string {
  let fullPath = path;
  if (Object.keys(query).length) {
    fullPath += '?' + stringifyQuery(query);
  }
  if (hash) {
    fullPath += '#' + hash;
  }
  return fullPath;
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
 * @returns RouterHistory 实例
 */
export function createWebHistory(base: string = '/'): RouterHistory {
  const normalizedBase = normalizePath(base);
  const listeners: HistoryChangeListener[] = [];
  let currentState: any = null;
  let currentLocation: RouterLocation = resolveLocation(window.location.href);

  function onPopState(event: PopStateEvent): void {
    const newLocation = resolveLocation(window.location.href);
    newLocation.fromPopState = true;
    newLocation.state = event.state;

    const from = currentLocation;
    currentLocation = newLocation;
    currentState = event.state;

    notifyListeners(newLocation, from);
  }

  function resolveLocation(url: string): RouterLocation {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      parsedUrl = new URL(url, window.location.origin);
    }

    let pathname = parsedUrl.pathname;
    if (normalizedBase !== '/') {
      if (pathname.startsWith(normalizedBase)) {
        pathname = pathname.slice(normalizedBase.length) || '/';
      }
    }

    const { path, query, hash } = parseFullPath(pathname + parsedUrl.hash);

    return {
      path: normalizePath(path),
      fullPath: buildFullPath(normalizePath(path), query, hash),
      query,
      hash,
      state: currentState,
      fromPopState: false,
    };
  }

  function notifyListeners(to: RouterLocation, from: RouterLocation): void {
    for (const listener of listeners) {
      listener(to, from);
    }
  }

  window.addEventListener('popstate', onPopState);

  return {
    base: normalizedBase,

    get location(): RouterLocation {
      return currentLocation;
    },

    get state(): any {
      return currentState;
    },

    push(to: string, data?: any): void {
      const normalizedPath = normalizePath(to);
      const from = currentLocation;
      const fullPath = (normalizedBase + normalizedPath).replace(/\/+/g, '/');

      currentState = data || null;
      window.history.pushState(currentState, '', fullPath);

      currentLocation = resolveLocation(window.location.href);
      currentLocation.state = currentState;

      notifyListeners(currentLocation, from);
    },

    replace(to: string, data?: any): void {
      const normalizedPath = normalizePath(to);
      const from = currentLocation;
      const fullPath = (normalizedBase + normalizedPath).replace(/\/+/g, '/');

      currentState = data || null;
      window.history.replaceState(currentState, '', fullPath);

      currentLocation = resolveLocation(window.location.href);
      currentLocation.state = currentState;

      notifyListeners(currentLocation, from);
    },

    go(delta: number, triggerListeners: boolean = true): void {
      window.history.go(delta);
    },

    listen(callback: HistoryChangeListener): () => void {
      listeners.push(callback);
      return () => {
        const index = listeners.indexOf(callback);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      };
    },

    destroy(): void {
      window.removeEventListener('popstate', onPopState);
      listeners.length = 0;
    },

    setLocation(location: RouterLocation): void {
      currentLocation = location;
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
 * @param base - 基础路径（通常为 '/'）
 * @returns RouterHistory 实例
 */
export function createWebHashHistory(base: string = '/'): RouterHistory {
  const listeners: HistoryChangeListener[] = [];
  let currentState: any = null;
  let currentLocation: RouterLocation = resolveHashLocation();

  function onHashChange(): void {
    const newLocation = resolveHashLocation();
    newLocation.fromPopState = true;

    const from = currentLocation;
    currentLocation = newLocation;

    notifyListeners(newLocation, from);
  }

  function resolveHashLocation(): RouterLocation {
    const hash = window.location.hash;
    const hashPath = hash.slice(1) || '/';
    const { path, query, hash: fragment } = parseFullPath(hashPath);

    return {
      path: normalizePath(path),
      fullPath: buildFullPath(normalizePath(path), query, fragment),
      query,
      hash: fragment,
      state: currentState,
      fromPopState: false,
    };
  }

  function notifyListeners(to: RouterLocation, from: RouterLocation): void {
    for (const listener of listeners) {
      listener(to, from);
    }
  }

  window.addEventListener('hashchange', onHashChange);

  return {
    base,

    get location(): RouterLocation {
      return currentLocation;
    },

    get state(): any {
      return currentState;
    },

    push(to: string, data?: any): void {
      const normalizedPath = normalizePath(to);
      const from = currentLocation;

      currentState = data || null;
      window.location.hash = normalizedPath;

      currentLocation = resolveHashLocation();
      currentLocation.state = currentState;

      notifyListeners(currentLocation, from);
    },

    replace(to: string, data?: any): void {
      const normalizedPath = normalizePath(to);
      const from = currentLocation;

      currentState = data || null;
      window.location.replace(
        window.location.pathname +
        window.location.search +
        '#' + normalizedPath
      );

      currentLocation = resolveHashLocation();
      currentLocation.state = currentState;

      notifyListeners(currentLocation, from);
    },

    go(delta: number, triggerListeners: boolean = true): void {
      window.history.go(delta);
    },

    listen(callback: HistoryChangeListener): () => void {
      listeners.push(callback);
      return () => {
        const index = listeners.indexOf(callback);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      };
    },

    destroy(): void {
      window.removeEventListener('hashchange', onHashChange);
      listeners.length = 0;
    },

    setLocation(location: RouterLocation): void {
      currentLocation = location;
    },
  };
}

// ============================================================
// Memory History 模式
// ============================================================

/**
 * 创建内存模式的路由管理器
 *
 * 使用内存数组存储历史记录，适用于 SSR 和测试环境。
 * 不依赖浏览器 History API。
 *
 * @returns RouterHistory 实例
 */
export function createMemoryHistory(): RouterHistory {
  const listeners: HistoryChangeListener[] = [];
  let currentState: any = null;

  // 历史记录栈
  const stack: RouterLocation[] = [];
  // 当前位置索引
  let position: number = -1;

  // 初始化：放入一个默认位置
  const initialLocation: RouterLocation = {
    path: '/',
    fullPath: '/',
    query: {},
    hash: '',
    state: null,
    fromPopState: false,
  };
  stack.push(initialLocation);
  position = 0;

  function notifyListeners(to: RouterLocation, from: RouterLocation): void {
    for (const listener of listeners) {
      listener(to, from);
    }
  }

  return {
    base: '/',

    get location(): RouterLocation {
      return stack[position] || initialLocation;
    },

    get state(): any {
      return currentState;
    },

    push(to: string, data?: any): void {
      const { path, query, hash } = parseFullPath(to);
      const normalizedPath = normalizePath(path);
      const from = this.location;

      currentState = data || null;

      // 丢弃当前位置之后的所有记录
      stack.splice(position + 1);

      const newLocation: RouterLocation = {
        path: normalizedPath,
        fullPath: buildFullPath(normalizedPath, query, hash),
        query,
        hash,
        state: currentState,
        fromPopState: false,
      };

      stack.push(newLocation);
      position = stack.length - 1;

      notifyListeners(newLocation, from);
    },

    replace(to: string, data?: any): void {
      const { path, query, hash } = parseFullPath(to);
      const normalizedPath = normalizePath(path);
      const from = this.location;

      currentState = data || null;

      const newLocation: RouterLocation = {
        path: normalizedPath,
        fullPath: buildFullPath(normalizedPath, query, hash),
        query,
        hash,
        state: currentState,
        fromPopState: false,
      };

      stack[position] = newLocation;

      notifyListeners(newLocation, from);
    },

    go(delta: number, triggerListeners: boolean = true): void {
      const newPosition = position + delta;

      if (newPosition < 0 || newPosition >= stack.length) {
        return;
      }

      const from = stack[position];
      position = newPosition;
      const to = stack[position];
      to.fromPopState = true;

      if (triggerListeners) {
        notifyListeners(to, from);
      }
    },

    listen(callback: HistoryChangeListener): () => void {
      listeners.push(callback);
      return () => {
        const index = listeners.indexOf(callback);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      };
    },

    destroy(): void {
      listeners.length = 0;
      stack.length = 0;
      position = -1;
    },

    setLocation(location: RouterLocation): void {
      stack[position] = location;
    },
  };
}
