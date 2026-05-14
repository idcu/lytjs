/**
 * @lytjs/router - useRoute composable
 */

import type { Signal } from '@lytjs/reactivity';
import type { RouteLocationNormalized } from '../types';
import { useRouter } from './useRouter';

/**
 * Get the current route location (reactive)
 * Returns a Signal that can be called to get the current route value
 */
export function useRoute(): Signal<RouteLocationNormalized> {
  const router = useRouter();
  return router.currentRoute;
}
