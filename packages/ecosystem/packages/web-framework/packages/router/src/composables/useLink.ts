/**
 * @lytjs/router - useLink composable
 *
 * Provides reactive navigation link state for building custom RouterLink components.
 */

import type { RouteLocationRaw, RouteLocationNormalized } from '../types';
import { useRouter } from './useRouter';
import { useRoute } from './useRoute';
import { computedSignal as computed } from '@lytjs/reactivity';
import { isSameRouteLocation } from '../location';

export interface UseLinkOptions {
  to: RouteLocationRaw;
  replace?: boolean;
  activeClass?: string;
  exactActiveClass?: string;
}

export function useLink(options: UseLinkOptions) {
  const router = useRouter();
  const route = useRoute();

  /**
   * ⚠️ 2026-11-04 修（P0）：这里此前自己调 `resolveLocation(options.to, route())`
   * —— **没有传第三个参数**（`{ resolveName }`）⇒ 命名路由解析不了，
   * `resolveLocation` 退化成「返回当前路径」。于是
   * `<RouterLink :to="{ name: 'user', params: { id: 7 } }">` 的 href 是**当前页面**，
   * 点了等于原地导航（用户看到「链接点了没反应」）。
   *
   * 现在统一走 `router.resolve()` —— 与真实导航共用同一段 `buildLocation`，
   * 链接与导航不会再分叉。
   */
  const targetLocation = computed(() => {
    return router.resolve(options.to);
  });

  /**
   * 「当前路由是否包含目标路由」。
   *
   * ⚠️ 2026-11-04 修（P1）：此前是 `route().path.startsWith(target.path)` ——
   *   **字符串前缀**，于是 `/user` 的链接在 `/username` 页面上也会高亮（侧边栏错位），
   *   而且 `/` 会匹配所有路径。
   *   现在按 **matched 记录**判断（与 Vue Router 的语义一致）：
   *   目标的 matched 链必须是当前 matched 链的**前缀**（嵌套路由才「包含」）。
   */
  const isActive = computed(() => {
    const target = targetLocation();
    const current = route() as RouteLocationNormalized;
    if (target.matched.length === 0) return false;
    if (target.matched.length > current.matched.length) return false;
    return target.matched.every((record, index) => current.matched[index] === record);
  });

  const isExactActive = computed(() => {
    return isSameRouteLocation(route() as RouteLocationNormalized, targetLocation());
  });

  const href = computed(() => targetLocation().fullPath);

  function navigate(e?: MouseEvent) {
    if (e) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (e.defaultPrevented) return;
      e.preventDefault();
    }

    if (options.replace) {
      router.replace(options.to);
    } else {
      router.push(options.to);
    }
  }

  return {
    route: targetLocation,
    href,
    isActive,
    isExactActive,
    navigate,
  };
}
