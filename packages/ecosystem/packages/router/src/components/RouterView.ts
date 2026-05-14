/**
 * @lytjs/router - RouterView component
 *
 * Renders the matched component for the current route.
 * Supports nested routes by rendering child RouterView.
 */

import type { RouteLocationNormalized } from '../types';
import { useRoute } from '../composables/useRoute';
import { computedSignal as computed } from '@lytjs/reactivity';

export interface RouterViewProps {
  name?: string;
  route?: RouteLocationNormalized;
}

/**
 * RouterView component
 * Renders the matched component for the current route.
 * Supports named views via the `name` prop and props passing from route records.
 */
export const RouterView = {
  name: 'RouterView',

  props: {
    name: {
      type: String,
      default: 'default',
    },
  },

  setup(props: RouterViewProps) {
    const route = useRoute();

    const matchedComponent = computed(() => {
      const currentRoute = route();
      const matched = currentRoute.matched;
      // Find the matched record for this view depth
      for (const record of matched) {
        if (record.components && record.components[props.name!]) {
          return { component: record.components[props.name!], record };
        }
        if (record.component && props.name === 'default') {
          return { component: record.component, record };
        }
      }
      return null;
    });

    return () => {
      const matched = matchedComponent();
      if (!matched) return null;

      const { component, record } = matched;
      // Resolve lazy component
      const resolvedComponent = typeof component === 'function' ? component() : component;

      // Compute props from route record
      let routeProps: Record<string, any> = {};
      const currentRoute = route();
      if (record.props) {
        if (typeof record.props === 'function') {
          routeProps = record.props(currentRoute);
        } else if (typeof record.props === 'object') {
          routeProps = record.props;
        } else if (record.props === true) {
          routeProps = currentRoute.params;
        }
      }

      // Return the component vnode
      if (resolvedComponent && typeof resolvedComponent === 'object' && 'setup' in resolvedComponent) {
        // Component object - return it for the renderer
        return { ...resolvedComponent, props: { ...routeProps, ...resolvedComponent.props } };
      }

      return resolvedComponent;
    };
  },
};
