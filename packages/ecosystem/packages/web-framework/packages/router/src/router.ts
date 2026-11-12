/**
 * @lytjs/router - createRouter implementation
 *
 * Core router with navigation, guard pipeline, and route matching.
 */

import type {
  Router,
  RouterOptions,
  RouteLocationNormalized,
  RouteLocationRaw,
  NavigationGuard,
  NavigationFailure,
  NavigationGuardNext,
  RouteParams,
} from './types';
import { NavigationFailureType, locationQueryToSearchParams } from './types';
import { signal } from '@lytjs/reactivity';
import { error, warn } from '@lytjs/common-error';
import {
  normalizeRouteRecord,
  flattenMatchers,
  matchPath,
  comparePriority,
  type RouteRecordMatcher,
} from './matcher';
import { resolveLocation, isSameRouteLocation } from './location';
import { setCurrentRouter } from './composables/useRouter';

/**
 * Create a router instance
 */
export function createRouter(options: RouterOptions): Router {
  // Build the matcher tree from route records
  // ⚠️ 2026-11-04：改为 `let` —— 动态路由（addRoute / removeRoute / clearRoutes）要重建。
  let matchers = options.routes.map((route) => normalizeRouteRecord(route));
  let flatMatchers = flattenMatchers(matchers);

  /** 重建扁平匹配表（增删路由后调用） */
  function rebuildMatchers(): void {
    flatMatchers = flattenMatchers(matchers);
  }

  /** 从树上摘掉一个 matcher（含其子树）并重建匹配表 */
  function removeMatcher(target: RouteRecordMatcher): void {
    const detach = (list: RouteRecordMatcher[]): boolean => {
      const index = list.indexOf(target);
      if (index > -1) {
        list.splice(index, 1);
        return true;
      }
      return false;
    };

    if (detach(matchers)) {
      rebuildMatchers();
      return;
    }
    // 在某个父节点的 children 里
    for (const parent of flatMatchers) {
      if (detach(parent.children)) {
        const recordIndex = parent.record.children.indexOf(target.record);
        if (recordIndex > -1) parent.record.children.splice(recordIndex, 1);
        rebuildMatchers();
        return;
      }
    }
  }

  // Current route state
  const currentRoute = signal<RouteLocationNormalized>({
    name: null,
    path: '/',
    fullPath: '/',
    query: {},
    hash: '',
    params: {},
    matched: [],
    meta: {},
  });

  // Navigation guard queues
  const beforeEachGuards: NavigationGuard[] = [];
  const beforeResolveGuards: NavigationGuard[] = [];
  const afterEachHooks: Array<
    (
      to: RouteLocationNormalized,
      from: RouteLocationNormalized,
      failure?: NavigationFailure,
    ) => void
  > = [];

  // Ready state
  let readyResolve: (() => void) | null = null;
  const readyPromise = new Promise<void>((resolve) => {
    readyResolve = resolve;
  });

  // Pending navigation
  let pendingNavigation: Promise<NavigationFailure | void> | null = null;

  /**
   * Resolve a route location by matching against all route records
   */
  function resolveRoute(path: string): {
    matched: RouteRecordMatcher[];
    params: Record<string, string | string[]>;
    meta: Record<string | number | symbol, unknown>;
  } {
    let bestMatch: RouteRecordMatcher | null = null;
    let bestPriority: number[] | null = null;
    let bestParams: Record<string, string | string[]> = {};

    for (const matcher of flatMatchers) {
      const result = matchPath(path, matcher.tokens, options.strict);
      if (!result.matched) continue;

      // ⚠️ 2026-11-04 修（P1）：此前比的是 `result.score`（**权重总和**），
      //   于是 `/a/b/*`(3+3+0=6) 输给 `/a/:x/:y`(3+2+2=7) —— 通配符路由永不命中。
      //   现在逐段字典序比较（与 http-server / runtime-edge 同一套规则）。
      const better =
        bestPriority === null ||
        comparePriority(result.priority, bestPriority) > 0 ||
        // 打平时**更深（子）优先**：默认子路由（`path: ''`）与父路由的 token 序列相同，
        // 否则父路由永远抢走命中 ⇒ `<RouterView>` 永远渲染不出默认子组件。
        (comparePriority(result.priority, bestPriority) === 0 &&
          matcher.depth > (bestMatch?.depth ?? 0));

      if (better) {
        bestPriority = result.priority;
        bestMatch = matcher;
        bestParams = result.params;
      }
    }

    if (!bestMatch) {
      return { matched: [], params: {}, meta: {} };
    }

    // Build the matched chain (parent -> child)
    const matched: RouteRecordMatcher[] = [];
    let current: RouteRecordMatcher | undefined = bestMatch;
    while (current) {
      matched.unshift(current);
      current = current.parent;
    }

    // Merge meta from all matched records
    const meta: Record<string | number | symbol, unknown> = {};
    for (const m of matched) {
      Object.assign(meta, m.record.meta);
    }

    return { matched, params: bestParams, meta };
  }

  /**
   * Resolve a route name to a path
   */
  function resolveName(name: string | symbol, params?: RouteParams): { path: string } | null {
    for (const matcher of flatMatchers) {
      if (matcher.record.name === name) {
        let path = matcher.record.path;
        // Replace params in path
        if (params) {
          for (const [key, value] of Object.entries(params)) {
            const paramValue = Array.isArray(value) ? value.join('/') : value;
            path = path.replace(`:${key}`, paramValue);
          }
        }
        return { path };
      }
    }
    return null;
  }

  /**
   * Navigate to a new route
   */
  /**
   * 把任意 `RouteLocationRaw` 解析成**完整**路由位置。
   *
   * ⚠️ 2026-11-04 新增：`navigate()` 与公开的 `resolve()` **必须**共用这一段 ——
   *   此前 `useLink` 自己拼 href（且没传 `resolveName`），于是命名路由的链接指向
   *   当前页面；两处逻辑一旦分叉，链接与真实导航就会不一致。
   */
  function buildLocation(to: RouteLocationRaw): {
    location: RouteLocationNormalized;
    matched: RouteRecordMatcher[];
    unknownName: boolean;
  } {
    const resolved = resolveLocation(to, currentRoute(), { resolveName });

    // 名字找不到对应路由：`resolveLocation` 会退化成「当前路径」，必须单独标记出来，
    // 否则导航会变成「原地重复导航」（用户看到的是点了没反应）。
    const requestedName = typeof to === 'string' ? null : (to.name ?? null);
    const requestedParams = typeof to === 'string' ? undefined : to.params;
    const unknownName = requestedName !== null && !resolveName(requestedName, requestedParams);

    const targetPath = unknownName ? currentRoute().path : resolved.path;
    const { matched, params, meta } = resolveRoute(targetPath);
    const lastMatched = matched[matched.length - 1];

    const queryString = Object.keys(resolved.query).length
      ? '?' + locationQueryToSearchParams(resolved.query).toString()
      : '';
    const hashString = resolved.hash ? `#${resolved.hash}` : '';

    return {
      location: {
        name: unknownName ? requestedName : (lastMatched?.record?.name ?? null),
        path: targetPath,
        fullPath: resolved.path + queryString + hashString,
        query: resolved.query,
        hash: resolved.hash,
        params,
        matched: matched.map((m) => m.record),
        meta,
      },
      matched,
      unknownName,
    };
  }

  /** 重定向嵌套深度（只统计守卫触发的重定向，用户主动导航不计数） */
  let redirectDepth = 0;
  const MAX_REDIRECT_DEPTH = 10;

  async function navigate(
    to: RouteLocationRaw,
    replace: boolean = false,
    isRedirect: boolean = false,
    /**
     * 强制跑完整管线（跳过「重复导航」判定）。
     *
     * 初始导航（`app.use(router)`）需要它：那时 `currentRoute` 还是占位值，
     * 但如果首屏恰好就是 `/`，重复判定会把整条守卫链跳过。
     */
    force: boolean = false,
  ): Promise<NavigationFailure | void> {
    // ⚠️ 2026-10-27 修（P0）：无条件重定向（`beforeEach(() => '/x')` 且 /x 又重定向回来）
    //   此前没有任何深度上限 ⇒ 实测 256MB 堆 **OOM 进程崩溃**。
    if (isRedirect) {
      redirectDepth += 1;
      if (redirectDepth > MAX_REDIRECT_DEPTH) {
        redirectDepth = 0;
        error(
          `[router] 重定向超过 ${MAX_REDIRECT_DEPTH} 层，已中止（疑似守卫无条件重定向导致死循环）`,
        );
        return {
          type: NavigationFailureType.aborted,
          from: currentRoute(),
          to: currentRoute(),
        };
      }
    }
    try {
      // Check for duplicate navigation
      const built = buildLocation(to);

      // 未知名字：无法解析，直接中止（与「路径未匹配」区分开，提示语也不同）
      if (built.unknownName) {
        warn(
          `[router] 没有名为 "${String(built.location.name)}" 的路由，本次导航被忽略` +
            `（仍停在 "${currentRoute().path}"）。`,
        );
        return {
          type: NavigationFailureType.aborted,
          from: currentRoute(),
          to: currentRoute(),
        };
      }

      const targetLocation = built.location;
      const matched = built.matched;
      const targetPath = targetLocation.path;

      if (matched.length === 0) {
        // ⚠️ 2026-11-04 新增：此前**完全静默** —— `push('/typo')` 之后路由停在原页面，
        //   用户看到的是「点了没反应」，而控制台一个字都没有。
        //   不改成「导航到空匹配」是有意的（那会让 `push` 的返回值语义变化）；
        //   这里至少把「为什么没动」和「怎么支持 404」讲清楚。
        warn(
          `[router] 没有匹配 "${targetPath}" 的路由，本次导航被忽略（仍停在 "${currentRoute().path}"）。` +
            `如需 404 页面，请添加 catch-all 路由：{ path: '/*', component: NotFound }。`,
        );
        return {
          type: NavigationFailureType.aborted,
          from: currentRoute(),
          to: currentRoute(),
        };
      }

      // ⚠️ 2026-11-04 修（P0）：**记录级重定向此前完全没实现**。
      //   `RouteRecordRaw.redirect` 在类型里一直声明着，但 `normalizeRouteRecord` 不拷贝、
      //   这里也不读 ⇒ 用户写 `{ path: '/old', redirect: '/new' }` 之后导航停在 `/old`
      //   （既不报错也不告警）。现在支持三种写法：
      //     · 字符串 / location 对象：`redirect: '/new'`
      //     · 函数：`redirect: (to) => ({ name: 'x', query: { from: to.path } })`
      //   重定向在**守卫之前**处理（与 Vue Router 一致）：目标路由的守卫照常执行。
      const redirectOption = matched[matched.length - 1]?.record?.redirect;
      if (redirectOption) {
        const redirectTarget =
          typeof redirectOption === 'function' ? redirectOption(targetLocation) : redirectOption;
        await navigate(redirectTarget, replace, true);
        return {
          type: NavigationFailureType.redirected,
          from: currentRoute(),
          to: targetLocation,
        };
      }

      // Check for same route navigation
      if (!force && isSameRouteLocation(currentRoute(), targetLocation)) {
        return {
          type: NavigationFailureType.duplicated,
          from: currentRoute(),
          to: targetLocation,
        };
      }

      const from = currentRoute();

      // Run navigation guards (pass fromMatched for beforeRouteLeave)
      const fromMatched = currentRoute()
        .matched.map((record) => {
          // Find the corresponding matcher for the from route records
          return flatMatchers.find((m) => m.record === record);
        })
        .filter((m): m is RouteRecordMatcher => m !== undefined);

      const failure = await runGuardSequence(targetLocation, from, matched, fromMatched);
      if (failure) {
        return failure;
      }

      // Commit navigation
      if (replace) {
        await options.history.replace(targetLocation);
      } else {
        await options.history.push(targetLocation);
      }

      currentRoute.set(targetLocation);

      // Handle scroll behavior
      if (options.scrollBehavior) {
        const savedPosition = replace ? null : null; // Would come from history.state
        const scrollPosition = options.scrollBehavior(targetLocation, from, savedPosition);
        if (scrollPosition) {
          // Use requestAnimationFrame for smooth scrolling
          if (typeof window !== 'undefined') {
            window.scrollTo(scrollPosition);
          }
        }
      }

      // Run afterEach hooks
      for (const hook of afterEachHooks) {
        hook(targetLocation, from);
      }

      return;
    } finally {
      if (isRedirect) redirectDepth -= 1;
    }
  }

  /**
   * 守卫结果归一化 —— **同时支持两种风格**：
   *
   *   | 写法 | 结果 |
   *   |---|---|
   *   | `next()` / 无返回 / 返回 `true` | 继续 |
   *   | `next(false)` / 返回 `false` / 抛错 | 中止 |
   *   | `next('/login')` / 返回 `'/login'` / 返回 location 对象 | 重定向 |
   *
   * ⚠️ 2026-10-27 修（P0）：此前 4 处调用都传的是 `noop`（空函数）——
   *   守卫里写 `next('/login')` **什么都不会发生**，导航静默放行到受保护路由。
   *   这是「看起来有守卫、实际没守卫」的最坏形态：不报错、不告警。
   */
  type GuardOutcome =
    | { action: 'proceed' }
    | { action: 'abort' }
    | { action: 'redirect'; target: RouteLocationRaw };

  function interpretGuardDecision(decided: unknown): GuardOutcome {
    if (decided === false) return { action: 'abort' };
    if (decided instanceof Error) return { action: 'abort' };
    if (typeof decided === 'string') return { action: 'redirect', target: decided };
    if (decided !== null && typeof decided === 'object') {
      return { action: 'redirect', target: decided as RouteLocationRaw };
    }
    return { action: 'proceed' };
  }

  async function runSingleGuard(
    guard: (
      to: RouteLocationNormalized,
      from: RouteLocationNormalized,
      next: NavigationGuardNext,
    ) => unknown,
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
  ): Promise<GuardOutcome> {
    let nextCalled = false;
    let nextArg: unknown;
    const next = ((value?: unknown) => {
      // 只认第一次调用：重复 next 是常见误用，不应改变结论
      if (!nextCalled) {
        nextCalled = true;
        nextArg = value;
      }
    }) as NavigationGuardNext;

    const returned = await guard(to, from, next);
    return interpretGuardDecision(nextCalled ? nextArg : returned);
  }

  /**
   * Run the full navigation guard sequence
   */
  async function runGuardSequence(
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    matched: RouteRecordMatcher[],
    fromMatched: RouteRecordMatcher[],
  ): Promise<NavigationFailure | void> {
    /** 执行一个守卫；返回 'proceed' 表示继续下一个守卫 */
    const step = async (
      guard: (
        to: RouteLocationNormalized,
        from: RouteLocationNormalized,
        next: NavigationGuardNext,
      ) => unknown,
    ): Promise<NavigationFailure | 'proceed'> => {
      const outcome = await runSingleGuard(guard, to, from);
      if (outcome.action === 'proceed') return 'proceed';
      if (outcome.action === 'abort') {
        return { type: NavigationFailureType.aborted, from, to };
      }
      // 重定向：内层导航在这里完成，外层必须**停止**，
      // 否则会把原目标提交上去（此前正是如此：用户被送进受保护页）。
      await navigate(outcome.target, true, true);
      return { type: NavigationFailureType.redirected, from, to };
    };

    // 1. in-component beforeRouteLeave guards (from current matched components)
    for (const matcher of fromMatched) {
      const component = matcher.record.component as Record<string, unknown> | undefined;
      const leaveGuard = component?.beforeRouteLeave as
        | ((
            to: RouteLocationNormalized,
            from: RouteLocationNormalized,
            next: NavigationGuardNext,
          ) => unknown)
        | undefined;
      if (leaveGuard) {
        const result = await step(leaveGuard);
        if (result !== 'proceed') return result;
      }
    }

    // 2. global beforeEach guards
    for (const guard of beforeEachGuards) {
      const result = await step(guard);
      if (result !== 'proceed') return result;
    }

    // 3. route record beforeEnter guards
    for (const matcher of matched) {
      if (matcher.record.beforeEnter) {
        const result = await step(matcher.record.beforeEnter);
        if (result !== 'proceed') return result;
      }
    }

    // 4. global beforeResolve guards
    for (const guard of beforeResolveGuards) {
      const result = await step(guard);
      if (result !== 'proceed') return result;
    }

    return;
  }

  // Listen to history changes (popstate/hashchange)
  options.history.listen((to, _from, info) => {
    if (info.type !== 'pop') return;
    // Re-resolve the route for the new location
    const { matched, params, meta } = resolveRoute(to.path);
    const newLocation: RouteLocationNormalized = {
      ...to,
      params,
      matched: matched.map((m) => m.record),
      meta: { ...meta, ...to.meta },
    };
    // P0-7：浏览器前进/后退必须走完整导航管线（beforeEach / beforeRouteLeave /
    // beforeEnter / beforeResolve / 重定向 / afterEach），不能直接 set。
    // replace=true：pop 已改变历史栈位置，守卫通过后只替换当前条目，
    // 不能再 push（否则每次前进/后退都会堆叠新条目）。
    void (async () => {
      const failure = await navigate(newLocation, true);
      if (failure) {
        // 被守卫中止/拒绝时，地址栏已在 popstate 中变成目标页，
        // 必须恢复到当前已授权的路由，避免停留在被拒绝的 URL。
        await options.history.replace(currentRoute());
      }
    })().catch((err) => {
      error(`[router] popstate 导航失败: ${String(err)}`);
    });
  });

  const router: Router = {
    currentRoute,
    options,
    resolveName,

    async push(to) {
      if (pendingNavigation) return pendingNavigation;
      try {
        pendingNavigation = navigate(to, false);
        return await pendingNavigation;
      } finally {
        pendingNavigation = null;
      }
    },

    async replace(to) {
      if (pendingNavigation) return pendingNavigation;
      try {
        pendingNavigation = navigate(to, true);
        return await pendingNavigation;
      } finally {
        pendingNavigation = null;
      }
    },

    go(delta) {
      options.history.go(delta);
    },

    back() {
      this.go(-1);
    },

    forward() {
      this.go(1);
    },

    beforeEach(guard) {
      beforeEachGuards.push(guard);
      return () => {
        const index = beforeEachGuards.indexOf(guard);
        if (index > -1) beforeEachGuards.splice(index, 1);
      };
    },

    afterEach(hook) {
      afterEachHooks.push(hook);
      return () => {
        const index = afterEachHooks.indexOf(hook);
        if (index > -1) afterEachHooks.splice(index, 1);
      };
    },

    beforeResolve(guard) {
      beforeResolveGuards.push(guard);
      return () => {
        const index = beforeResolveGuards.indexOf(guard);
        if (index > -1) beforeResolveGuards.splice(index, 1);
      };
    },

    install(app: {
      config?: { globalProperties?: Record<string, unknown> };
      provide?: (key: string, value: unknown) => void;
    }) {
      setCurrentRouter(router);

      if (app.config?.globalProperties) {
        app.config.globalProperties.$router = router;
      }

      if (app.provide) {
        app.provide('__lytjs_router__', router);
      }

      // ⚠️ 2026-11-04 修（P0）：**初始导航此前完全绕过守卫链**。
      //
      //   旧实现只做「resolveRoute + currentRoute.set」：不跑 beforeEach、不处理
      //   `redirect`、也不判定 404。实测：`createMemoryHistory('/private')` +
      //   `beforeEach` 里把 `/private` 重定向到 `/login`，`app.use(router)` 之后
      //   仍停在 `/private` —— **鉴权守卫在首次进入（深链 / 刷新 / 直接打开）时被绕过**，
      //   而这正是它最该生效的时刻。且 `isReady()` 在守卫跑之前就 resolve 了。
      //
      //   现在：初始导航走**同一条 navigate 管线**（守卫 / 重定向 / 404 判定 / afterEach），
      //   `isReady()` 在它落定之后才 resolve（与 Vue Router 一致）。
      //   代价与 Vue 相同：`currentRoute` 在首帧是占位值，需要「首屏就绪」的宿主
      //   应 `await router.isReady()` 再挂载。
      const initialLocation = options.history.location;
      const initialTarget =
        (initialLocation as { fullPath?: string }).fullPath ?? initialLocation.path ?? '/';

      /**
       * 初始导航有两条路：
       *
       * · **快路径（同步）**：没有任何守卫 / 重定向时，解析结果就是最终结果 ——
       *   直接落定，首帧即可渲染正确页面（`RouterView` 不必等一个 tick）。
       *   这同时也是「install 之后立刻 push」不产生竞态的前提。
       * · **慢路径（异步）**：只要存在 `beforeEach` / `beforeResolve` /
       *   记录级 `beforeEnter` / `redirect`，就必须走完整管线 ——
       *   否则守卫会被绕过（本轮修的那个 P0）。代价是首帧为占位路由。
       */
      const { matched: initialMatched } = resolveRoute(initialTarget.split('?')[0] || '/');
      const needsPipeline =
        beforeEachGuards.length > 0 ||
        beforeResolveGuards.length > 0 ||
        initialMatched.some((m) => m.record.beforeEnter || m.record.redirect);

      if (!needsPipeline) {
        const { params, meta } = resolveRoute(initialTarget.split('?')[0] || '/');
        currentRoute.set({
          ...initialLocation,
          // ⚠️ 2026-11-04 修（P1）：此前这里**不写 `name`** —— `initialLocation` 里的
          //   `name` 是 `null`，于是首帧的 `useRoute().name` 恒为 null（按名字判断
          //   当前页面的代码全部失效），而 `navigate()` 那条路是写了的。
          name: initialMatched[initialMatched.length - 1]?.record?.name ?? null,
          params,
          matched: initialMatched.map((m) => m.record),
          meta: { ...meta, ...initialLocation.meta },
        });
        readyResolve?.();
        return;
      }

      void navigate(initialTarget, true, false, true)
        .catch((err) => {
          error(`[router] 初始导航失败：${err instanceof Error ? err.message : String(err)}`);
        })
        .finally(() => {
          readyResolve?.();
        });
    },

    async isReady() {
      return readyPromise;
    },

    /**
     * 把任意路由描述解析成完整位置（含 matched / meta / fullPath）。
     *
     * 与 `navigate()` 共用同一段 `buildLocation`，因此**链接里的 href 与真实导航
     * 永远一致**（此前 useLink 自己拼，命名路由会拼成当前路径）。
     * 未匹配的路径也返回位置（`matched: []`），调用方可据此渲染 404。
     */
    resolve(to: RouteLocationRaw): RouteLocationNormalized {
      return buildLocation(to).location;
    },

    getRoutes() {
      // 别名 matcher 共享同一个 record ⇒ 去重（否则 getRoutes 里会出现重复条目）
      return [...new Set(flatMatchers.map((m) => m.record))];
    },

    hasRoute(name) {
      return flatMatchers.some((m) => m.record.name === name);
    },

    addRoute(record, parentName) {
      const parent =
        parentName !== undefined && parentName !== null
          ? (matchers.find((m) => m.record.name === parentName) ??
            flatMatchers.find((m) => m.record.name === parentName))
          : undefined;

      const matcher = normalizeRouteRecord(record as never, parent);
      if (parent) {
        parent.children.push(matcher);
        parent.record.children.push(matcher.record);
      } else {
        matchers.push(matcher);
      }
      rebuildMatchers();

      // 返回移除函数（与 Vue Router 一致）
      return () => {
        removeMatcher(matcher);
      };
    },

    removeRoute(name) {
      const target = matchers.find((m) => m.record.name === name);
      if (!target) return false;
      removeMatcher(target);
      return true;
    },

    clearRoutes() {
      matchers = [];
      rebuildMatchers();
    },
  };

  return router;
}
