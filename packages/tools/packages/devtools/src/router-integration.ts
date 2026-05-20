/**
 * @lytjs/devtools - Router integration
 *
 * Provides hooks for @lytjs/router to integrate with DevTools.
 */

import { recordEvent, isEventRecording } from './events';

/**
 * Track a router navigation in DevTools
 */
export function trackRouterNavigation(
  from: { path: string; fullPath: string },
  to: { path: string; fullPath: string },
): void {
  if (!isEventRecording()) return;

  recordEvent('router:navigation', {
    from: { path: from.path, fullPath: from.fullPath },
    to: { path: to.path, fullPath: to.fullPath },
  });
}
