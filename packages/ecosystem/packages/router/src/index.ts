/**
 * @lytjs/router
 *
 * LytJS declarative routing system with support for nested routes,
 * navigation guards, and multiple history modes.
 *
 * @packageDocumentation
 */

// Router core
export { createRouter } from './router';
export { createWebHistory } from './history';
export { createWebHashHistory } from './history';
export { createMemoryHistory } from './history';

// Composables
export { useRouter, setCurrentRouter } from './composables/useRouter';
export { useRoute } from './composables/useRoute';
export { useLink } from './composables/useLink';
export type { UseLinkOptions } from './composables/useLink';

// Components
export { RouterView } from './components/RouterView';
export type { RouterViewProps } from './components/RouterView';
export { RouterLink } from './components/RouterLink';
export type { RouterLinkProps } from './components/RouterLink';

// Types
export type {
  Router,
  RouterOptions,
  RouterHistory,
  RouteRecordRaw,
  RouteRecordNormalized,
  RouteLocationNormalized,
  RouteLocationRaw,
  RouteParams,
  LocationQuery,
  RouteMeta,
  RouteRecordName,
  NavigationGuard,
  NavigationGuardNext,
  NavigationGuardReturn,
  NavigationFailure,
  RouterScrollBehavior,
  NavigationInfo,
} from './types';

// Re-export NavigationFailureType as value (enum)
export { NavigationFailureType } from './types';
