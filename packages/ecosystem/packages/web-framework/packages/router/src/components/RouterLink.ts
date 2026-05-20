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
import { resolveLocation, isSameRouteLocation } from '../location';

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
      return route().path.startsWith(target.path);
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

      const linkData = {
        tag: 'a',
        props: {
          href: href(),
          class: classes.join(' '),
          'aria-current': isExactActive() ? props.ariaCurrentValue : undefined,
          onClick: handleClick,
        },
        children: slots?.default
          ? slots.default({ isActive: isActive(), isExactActive: isExactActive() })
          : null,
      };

      return linkData;
    };
  },
};
