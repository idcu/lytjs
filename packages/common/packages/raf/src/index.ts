/**
 * @lytjs/common-raf
 * Cross-platform requestAnimationFrame utilities
 */

const _raf =
  typeof requestAnimationFrame !== 'undefined'
    ? requestAnimationFrame
    : (cb: FrameRequestCallback): ReturnType<typeof setTimeout> =>
        setTimeout(() => cb(performance.now()), 16);

const _caf =
  typeof cancelAnimationFrame !== 'undefined'
    ? cancelAnimationFrame
    : (id: number): void => clearTimeout(id);

/**
 * requestAnimationFrame cross-platform wrapper
 */
export function raf(callback: FrameRequestCallback): number {
  return _raf(callback) as number;
}

/**
 * cancelAnimationFrame cross-platform wrapper
 */
export function caf(id: number): void {
  _caf(id);
}

/**
 * Wait for the next animation frame
 */
export function nextFrame(): Promise<void> {
  return new Promise<void>((resolve) => {
    raf(() => resolve());
  });
}

/**
 * Throttle a function to run at most once per animation frame
 */
export function rafThrottle<T extends (...args: unknown[]) => unknown>(fn: T): T {
  let pending = false;
  let latestArgs: unknown[] | null = null;

  const throttled = (...args: unknown[]) => {
    latestArgs = args;
    if (!pending) {
      pending = true;
      raf(() => {
        pending = false;
        if (latestArgs) {
          fn(...latestArgs);
          latestArgs = null;
        }
      });
    }
  };

  return throttled as T;
}

/**
 * Debounce a function to run after a specified number of frames (default: 1)
 */
export function rafDebounce<T extends (...args: unknown[]) => unknown>(fn: T, delay?: number): T {
  let id: number | null = null;
  let latestArgs: unknown[] | null = null;
  let remaining = delay ?? 1;

  const debounced = (...args: unknown[]) => {
    latestArgs = args;
    remaining = delay ?? 1;

    if (id !== null) {
      caf(id);
    }

    const tick = () => {
      remaining--;
      if (remaining <= 0) {
        id = null;
        if (latestArgs) {
          fn(...latestArgs);
          latestArgs = null;
        }
      } else {
        id = raf(tick);
      }
    };

    id = raf(tick);
  };

  return debounced as T;
}
