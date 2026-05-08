/**
 * @lytjs/router - RouterView component
 *
 * Renders the matched component for the current route.
 * Supports nested routes by rendering child RouterView.
 */

import type { RouteLocationNormalized } from '../types';

export interface RouterViewProps {
  name?: string;
  route?: RouteLocationNormalized;
}

/**
 * RouterView component
 * In a full implementation, this would integrate with the component system.
 * For now, it provides the basic structure.
 */
export const RouterView = {
  name: 'RouterView',

  props: {
    name: {
      type: String,
      default: 'default',
    },
  },

  setup(_props: RouterViewProps, { slots }: any) {
    return () => {
      // TODO: Integrate with component system to render matched component
      // This will be implemented when integrating with @lytjs/component
      return slots.default ? slots.default({}) : null;
    };
  },
};
