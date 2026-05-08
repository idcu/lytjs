/**
 * @lytjs/router - useRouter composable
 */

import type { Router } from '../types';

let currentRouter: Router | null = null;

/**
 * Set the active router instance (called during install)
 */
export function setCurrentRouter(router: Router): void {
  currentRouter = router;
}

/**
 * Get the current router instance
 */
export function useRouter(): Router {
  if (!currentRouter) {
    throw new Error(
      '[@lytjs/router] No active router instance. ' +
      'Make sure to call app.use(router) before using useRouter().',
    );
  }
  return currentRouter;
}
