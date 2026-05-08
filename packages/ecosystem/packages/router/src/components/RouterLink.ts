/**
 * @lytjs/router - RouterLink component
 *
 * Renders an anchor tag that navigates to the target route.
 */

import type { RouterLinkProps } from './RouterLink';
import { useRouter } from '../composables/useRouter';
import { useRoute } from '../composables/useRoute';
import { computed } from '@lytjs/reactivity';
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

  setup(props: RouterLinkProps, { slots }: any) {
    const router = useRouter();
    const route = useRoute();

    const targetLocation = computed(() => {
      return resolveLocation(props.to, route);
    });

    const isActive = computed(() => {
      const target = targetLocation.value;
      return route.path.startsWith(target.path);
    });

    const isExactActive = computed(() => {
      return isSameRouteLocation(route, targetLocation.value);
    });

    const href = computed(() => {
      const loc = targetLocation.value;
      const path = loc.path;
      const query = Object.keys(loc.query).length
        ? '?' + new URLSearchParams(loc.query as any).toString()
        : '';
      const hash = loc.hash ? `#${loc.hash}` : '';
      return path + query + hash;
    });

    function handleClick(event: Event) {
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
      if (isActive.value) classes.push(props.activeClass!);
      if (isExactActive.value) classes.push(props.exactActiveClass!);

      const linkData = {
        tag: 'a',
        props: {
          href: href.value,
          class: classes.join(' '),
          'aria-current': isExactActive.value ? props.ariaCurrentValue : undefined,
          onClick: handleClick,
        },
        children: slots.default ? slots.default({ isActive: isActive.value, isExactActive: isExactActive.value }) : null,
      };

      return linkData;
    };
  },
};
