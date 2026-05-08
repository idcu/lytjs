/**
 * @lytjs/router - useRoute composable
 */

import type { RouteLocationNormalized } from '../types';
import { useRouter } from './useRouter';

/**
 * Get the current route location
 */
export function useRoute(): RouteLocationNormalized {
  const router = useRouter();
  return router.currentRoute.value;
}
