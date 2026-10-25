/**
 * @lytjs/router - RouterLink component
 *
 * Renders an anchor tag that navigates to the target route.
 */

import type { RouteLocationNormalized } from '../types';
import { locationQueryToSearchParams } from '../types';
import { useRouter } from '../composables/useRouter';
import { useRoute } from '../composables/useRoute';
import { computedSignal as computed } from '@lytjs/reactivity';
import { createVNode } from '@lytjs/vdom';
import type { VNode } from '@lytjs/vdom';
import { resolveLocation, isSameRouteLocation } from '../location';

/**
 * 路径激活判定（**按段**比较）。
 *
 * ★ 2026-10-25 修复：此前是裸 `currentPath.startsWith(target.path)`，两个常见误判：
 * ① `to="/"` —— 任何路径都以 `/` 开头 ⇒ 首页链接在**所有**路由下都高亮；
 * ② `to="/user"` 在 `/users/1` 下也被判激活（前缀恰好命中）。
 * 现在要求"相等"或"命中后紧跟 `/`"，且 `/` 只匹配 `/`。
 */
function isPathActive(currentPath: string, targetPath: string): boolean {
  if (targetPath === '' || targetPath === '/') {
    return currentPath === '' || currentPath === '/';
  }
  const target = targetPath.endsWith('/') ? targetPath.slice(0, -1) : targetPath;
  return currentPath === target || currentPath.startsWith(`${target}/`);
}

export interface RouterLinkProps {
  to: string;
  replace?: boolean;
  activeClass?: string;
  exactActiveClass?: string;
  ariaCurrentValue?: string;
}

/**
 * RouterLink component
 * Renders an anchor tag that navigates to the target route.
 * Supports active state detection and aria-current attribute.
 */
export const RouterLink = {
  name: 'RouterLink',

  props: {
    to: {
      type: String,
      required: true,
    },
    replace: {
      type: Boolean,
      default: false,
    },
    activeClass: {
      type: String,
      default: 'router-link-active',
    },
    exactActiveClass: {
      type: String,
      default: 'router-link-exact-active',
    },
    ariaCurrentValue: {
      type: String,
      default: 'page',
    },
  },

  setup(
    props: RouterLinkProps,
    {
      slots,
    }: {
      slots?: {
        default?: (props?: unknown) => unknown;
        [key: string]: ((props?: unknown) => unknown) | undefined;
      };
    },
  ) {
    const router = useRouter();
    const route = useRoute();

    const targetLocation = computed(() => {
      return resolveLocation(props.to, route());
    });

    const isActive = computed(() => {
      const target = targetLocation();
      return isPathActive(route().path, target.path);
    });

    const isExactActive = computed(() => {
      return isSameRouteLocation(route() as RouteLocationNormalized, targetLocation());
    });

    const href = computed(() => {
      const loc = targetLocation();
      const path = loc.path;
      const query = Object.keys(loc.query).length
        ? '?' + locationQueryToSearchParams(loc.query).toString()
        : '';
      const hash = loc.hash ? `#${loc.hash}` : '';
      return path + query + hash;
    });

    function handleClick(event: MouseEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (event.defaultPrevented) return;
      if (event.button !== undefined && event.button !== 0) return;

      event.preventDefault();

      if (props.replace) {
        router.replace(props.to);
      } else {
        router.push(props.to);
      }
    }

    return () => {
      const classes: string[] = [];
      if (isActive()) classes.push(props.activeClass!);
      if (isExactActive()) classes.push(props.exactActiveClass!);

      const children = slots?.default
        ? slots.default({ isActive: isActive(), isExactActive: isExactActive() })
        : null;

      // ★ 2026-10-25 修复（P1）：此前返回的是描述对象 `{ tag, props, children }`，
      //   而渲染器只认带 `type` 的 vnode ⇒ `<RouterLink>` **渲染不出任何东西**
      //   （patch 拿到的 `n2.type` 是 undefined）。改为真正的 `createVNode('a', …)`。
      return createVNode(
        'a',
        {
          href: href(),
          class: classes.join(' '),
          'aria-current': isExactActive() ? props.ariaCurrentValue : undefined,
          onClick: handleClick,
        },
        children as VNode[] | null,
      );
    };
  },
};
