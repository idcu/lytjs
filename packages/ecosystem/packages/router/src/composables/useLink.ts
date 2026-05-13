/**
 * @lytjs/router - useLink composable
 *
 * Provides reactive navigation link state for building custom RouterLink components.
 */

import type { RouteLocationRaw, RouteLocationNormalized } from '../types';
import { useRouter } from './useRouter';
import { useRoute } from './useRoute';
import { computedSignal as computed } from '@lytjs/reactivity';
import { resolveLocation, isSameRouteLocation } from '../location';

export interface UseLinkOptions {
  to: RouteLocationRaw;
  replace?: boolean;
  activeClass?: string;
  exactActiveClass?: string;
}

export function useLink(options: UseLinkOptions) {
  const router = useRouter();
  const route = useRoute();

  const targetLocation = computed(() => {
    return resolveLocation(options.to, route);
  });

  const isActive = computed(() => {
    const target = targetLocation();
    return route.path.startsWith(target.path);
  });

  const isExactActive = computed(() => {
    return isSameRouteLocation(route, targetLocation());
  });

  const href = computed(() => {
    const loc = targetLocation();
    const path = loc.path;
    const query = Object.keys(loc.query).length
      ? '?' + new URLSearchParams(loc.query as any).toString()
      : '';
    const hash = loc.hash ? `#${loc.hash}` : '';
    return path + query + hash;
  });

  function navigate(e?: Event) {
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
