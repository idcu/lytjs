/**
 * @lytjs/router - RouterLink component
 *
 * Renders an anchor tag that navigates to the target route.
 */

export interface RouterLinkProps {
  to: string;
  replace?: boolean;
  activeClass?: string;
  exactActiveClass?: string;
  ariaCurrentValue?: string;
}

/**
 * RouterLink component
 * In a full implementation, this would integrate with the component system.
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
    return () => {
      // TODO: Integrate with component system to render <a> tag
      // This will be implemented when integrating with @lytjs/component
      return slots.default ? slots.default({}) : null;
    };
  },
};
