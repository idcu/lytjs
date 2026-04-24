/**
 * Lyt.js 路由系统 — 导航守卫（Guards）
 *
 * 提供全局导航守卫机制，在路由导航过程中执行拦截逻辑。
 *
 * 守卫类型：
 * 1. beforeEach — 全局前置守卫（在导航确认前调用）
 * 2. beforeResolve — 全局解析守卫（在导航确认后、组件渲染前调用）
 * 3. afterEach — 全局后置守卫（在导航完成后调用）
 *
 * 导航控制（通过 next 函数）：
 * - next() — 确认导航
 * - next(false) — 取消导航
 * - next('/path') — 重定向到指定路径
 *
 * 纯原生零依赖实现。
 */

// ============================================================
// 类型定义
// ============================================================

/** 路由目标位置（简化版） */
export interface NavigationTarget {
  /** 目标路径 */
  path: string;
  /** 完整路径（含 query 和 hash） */
  fullPath: string;
  /** 路由参数 */
  params: Record<string, string>;
  /** 路由名称 */
  name?: string;
  /** 路由元信息 */
  meta?: Record<string, any>;
  /** 查询参数 */
  query: Record<string, string>;
  /** hash 值 */
  hash: string;
}

/** 导航守卫回调函数 */
export type NavigationGuard = (
  to: NavigationTarget,
  from: NavigationTarget,
  next: NavigationGuardNext
) => void;

/** next 函数类型 */
export type NavigationGuardNext = (
  location?: string | false | void
) => void;

/** 导航守卫管理器 */
export interface NavigationGuards {
  /** 注册全局前置守卫 */
  beforeEach(guard: NavigationGuard): () => void;
  /** 注册全局解析守卫 */
  beforeResolve(guard: NavigationGuard): () => void;
  /** 注册全局后置守卫 */
  afterEach(guard: (to: NavigationTarget, from: NavigationTarget) => void): () => void;
  /** 前置守卫列表（内部使用） */
  _beforeEachGuards: NavigationGuard[];
  /** 解析守卫列表（内部使用） */
  _beforeResolveGuards: NavigationGuard[];
  /** 后置守卫列表（内部使用） */
  _afterEachGuards: Array<(to: NavigationTarget, from: NavigationTarget) => void>;
}

// ============================================================
// 导航守卫实现
// ============================================================

/**
 * 创建导航守卫管理器
 *
 * 维护三类守卫队列，提供注册和执行方法。
 *
 * @returns 导航守卫管理器
 *
 * @example
 * ```ts
 * const guards = createNavigationGuards()
 *
 * // 注册前置守卫
 * const remove = guards.beforeEach((to, from, next) => {
 *   if (to.path === '/admin' && !isLoggedIn) {
 *     next('/login')  // 重定向到登录页
 *   } else {
 *     next()  // 确认导航
 *   }
 * })
 *
 * // 注册后置守卫
 * guards.afterEach((to, from) => {
 *   console.log('导航完成:', to.path)
 * })
 *
 * // 移除守卫
 * remove()
 * ```
 */
export function createNavigationGuards(): NavigationGuards {
  /** 前置守卫列表 */
  const beforeEachGuards: NavigationGuard[] = [];

  /** 解析守卫列表 */
  const beforeResolveGuards: NavigationGuard[] = [];

  /** 后置守卫列表（后置守卫没有 next 函数） */
  const afterEachGuards: Array<
    (to: NavigationTarget, from: NavigationTarget) => void
  > = [];

  /**
   * 注册全局前置守卫
   *
   * 前置守卫在导航确认前按注册顺序依次执行。
   * 如果某个守卫调用了 next(false) 或 next('/path')，
   * 后续守卫不会执行。
   *
   * @param guard - 守卫函数
   * @returns 取消注册的函数
   */
  function beforeEach(guard: NavigationGuard): () => void {
    beforeEachGuards.push(guard);

    // 返回取消注册函数
    return () => {
      const index = beforeEachGuards.indexOf(guard);
      if (index !== -1) {
        beforeEachGuards.splice(index, 1);
      }
    };
  }

  /**
   * 注册全局解析守卫
   *
   * 解析守卫在所有前置守卫通过后、导航确认前执行。
   * 适合用于数据预加载等场景。
   *
   * @param guard - 守卫函数
   * @returns 取消注册的函数
   */
  function beforeResolve(guard: NavigationGuard): () => void {
    beforeResolveGuards.push(guard);

    return () => {
      const index = beforeResolveGuards.indexOf(guard);
      if (index !== -1) {
        beforeResolveGuards.splice(index, 1);
      }
    };
  }

  /**
   * 注册全局后置守卫
   *
   * 后置守卫在导航完成后执行，不接受 next 函数。
   * 适合用于页面标题更新、日志记录等场景。
   *
   * @param guard - 守卫函数
   * @returns 取消注册的函数
   */
  function afterEach(
    guard: (to: NavigationTarget, from: NavigationTarget) => void
  ): () => void {
    afterEachGuards.push(guard);

    return () => {
      const index = afterEachGuards.indexOf(guard);
      if (index !== -1) {
        afterEachGuards.splice(index, 1);
      }
    };
  }

  return {
    /** 前置守卫列表（内部使用，供 runGuards 访问） */
    _beforeEachGuards: beforeEachGuards,
    /** 解析守卫列表（内部使用，供 runGuards 访问） */
    _beforeResolveGuards: beforeResolveGuards,
    /** 后置守卫列表（内部使用，供 runAfterGuards 访问） */
    _afterEachGuards: afterEachGuards,

    beforeEach,
    beforeResolve,
    afterEach,
  };
}

/**
 * 执行导航守卫队列
 *
 * 按顺序执行守卫函数，支持异步守卫。
 * 如果某个守卫调用了 next(false)，中止导航。
 * 如果某个守卫调用了 next('/path')，重定向。
 *
 * @param guards - 守卫函数列表
 * @param to - 目标路由
 * @param from - 来源路由
 * @returns Promise，resolve 表示导航确认，reject 表示导航中止或重定向
 */
export function runGuards(
  guards: NavigationGuard[],
  to: NavigationTarget,
  from: NavigationTarget
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // 守卫队列索引
    let index = 0;

    /**
     * 创建 next 函数
     *
     * next() — 确认当前守卫，执行下一个
     * next(false) — 中止导航
     * next('/path') — 重定向
     */
    function createNext(): NavigationGuardNext {
      // 防止多次调用 next
      let called = false;

      return (location?: string | false | void) => {
        // 防止重复调用
        if (called) {
          console.warn('next() 被多次调用。请确保每个守卫只调用一次 next()。');
          return;
        }
        called = true;

        if (location === false) {
          // 取消导航
          reject(new Error('导航被守卫中止'));
        } else if (typeof location === 'string') {
          // 重定向
          reject(new Error('REDIRECT:' + location));
        } else {
          // 确认当前守卫，执行下一个
          index++;
          runNext();
        }
      };
    }

    /**
     * 执行下一个守卫
     */
    function runNext(): void {
      // 所有守卫都已通过
      if (index >= guards.length) {
        resolve();
        return;
      }

      // 执行当前守卫
      const guard = guards[index];
      const next = createNext();

      try {
        const result = guard(to, from, next);

        // 如果守卫返回Promise，等待其完成
        if (result !== undefined && result !== null && typeof result === 'object' && typeof (result as any).then === 'function') {
          (result as Promise<void>)
            .then(() => {
              // Promise resolve 后，如果 next 没被调用，自动确认
              // （next 可能已经在 Promise 内部被调用了）
            })
            .catch((err: any) => {
              // Promise reject，中止导航
              if (!err || typeof err.message !== 'string' || !err.message.startsWith('REDIRECT:')) {
                reject(new Error('导航被守卫中止'));
              } else {
                reject(err);
              }
            });
        }
      } catch (err) {
        // 守卫执行出错，中止导航
        reject(new Error('导航守卫执行出错'));
      }
    }

    // 开始执行
    runNext();
  });
}

/**
 * 执行后置守卫队列
 *
 * 后置守卫不接受 next 函数，按顺序执行。
 *
 * @param guards - 后置守卫列表
 * @param to - 目标路由
 * @param from - 来源路由
 */
export function runAfterGuards(
  guards: Array<(to: NavigationTarget, from: NavigationTarget) => void>,
  to: NavigationTarget,
  from: NavigationTarget
): void {
  for (const guard of guards) {
    try {
      guard(to, from);
    } catch (err) {
      console.warn('后置守卫执行出错:', err);
    }
  }
}
