/**
 * @lytjs/vdom - transition
 * Vue 3 style Transition component support
 * Provides CSS/JS transition hooks for enter, leave, and appear animations
 */

// ============================================================
// TransitionProps
// ============================================================

export interface TransitionProps {
  name?: string;
  appear?: boolean;
  mode?: 'in-out' | 'out-in' | 'default';
  enterFromClass?: string;
  enterActiveClass?: string;
  enterToClass?: string;
  leaveFromClass?: string;
  leaveActiveClass?: string;
  leaveToClass?: string;
  onBeforeEnter?: (el: Element) => void;
  onEnter?: (el: Element, done: () => void) => void;
  onAfterEnter?: (el: Element) => void;
  onEnterCancelled?: (el: Element) => void;
  onBeforeLeave?: (el: Element) => void;
  onLeave?: (el: Element, done: () => void) => void;
  onAfterLeave?: (el: Element) => void;
  onLeaveCancelled?: (el: Element) => void;
}

// ============================================================
// Transition duration info
// ============================================================

export interface TransitionDurationInfo {
  /** Total transition duration in ms */
  duration: number;
  /** Whether the element has CSS transition */
  hasTransition: boolean;
  /** Whether the element has CSS animation */
  hasAnimation: boolean;
}

// ============================================================
// Internal transition state
// ============================================================

export interface TransitionState {
  /** Whether a transition is currently in progress */
  isLeaving: boolean;
  /** Whether the element has been inserted into the DOM */
  isInserted: boolean;
  /** Pending leave callback (for mode: out-in) */
  pendingLeaveCallback: (() => void) | null;
  /** Pending enter callback (for mode: in-out) */
  pendingEnterCallback: (() => void) | null;
}

// ============================================================
// Helper: nextFrame
// ============================================================

/**
 * Schedule a callback to run on the next animation frame.
 * Uses double rAF to ensure the browser has had a chance to paint.
 */
export function nextFrame(fn: () => void): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(fn);
  });
}

// ============================================================
// Helper: addTransitionClass / removeTransitionClass
// ============================================================

/**
 * Add a CSS class to an element for transition purposes.
 */
export function addTransitionClass(el: Element, cls: string): void {
  el.classList.add(cls);
}

/**
 * Remove a CSS class from an element for transition purposes.
 */
export function removeTransitionClass(el: Element, cls: string): void {
  el.classList.remove(cls);
}

// ============================================================
// Helper: getTransitionInfo
// ============================================================

/**
 * Get transition duration information from an element's computed styles.
 * Checks both CSS transitions and animations.
 */
export function getTransitionInfo(el: Element, _type: 'enter' | 'leave'): TransitionDurationInfo {
  const styles = getComputedStyle(el);
  const transitionDelays = getStylePropAsArray(styles, 'transitionDelay');
  const transitionDurations = getStylePropAsArray(styles, 'transitionDuration');
  const animationDelays = getStylePropAsArray(styles, 'animationDelay');
  const animationDurations = getStylePropAsArray(styles, 'animationDuration');

  const hasTransition =
    transitionDurations.some((d) => d !== '0s') ||
    transitionDelays.some((d) => d !== '0s');
  const hasAnimation =
    animationDurations.some((d) => d !== '0s') ||
    animationDelays.some((d) => d !== '0s');

  let duration = 0;

  if (hasTransition) {
    const maxDuration = Math.max(
      ...transitionDurations.map((d, i) => parseDuration(d) + parseDuration(transitionDelays[i] ?? '0s')),
    );
    duration = Math.max(duration, maxDuration);
  }

  if (hasAnimation) {
    const maxDuration = Math.max(
      ...animationDurations.map((d, i) => parseDuration(d) + parseDuration(animationDelays[i] ?? '0s')),
    );
    duration = Math.max(duration, maxDuration);
  }

  return {
    duration,
    hasTransition,
    hasAnimation,
  };
}

/**
 * Parse a CSS duration string (e.g., "0.3s", "300ms") to milliseconds.
 */
function parseDuration(value: string): number {
  if (value.endsWith('ms')) {
    return parseFloat(value);
  }
  if (value.endsWith('s')) {
    return parseFloat(value) * 1000;
  }
  return 0;
}

/**
 * Get a CSS property value as an array of strings (handles comma-separated values).
 */
function getStylePropAsArray(styles: CSSStyleDeclaration, prop: string): string[] {
  const value = styles.getPropertyValue(prop);
  if (!value) return [];
  return value.split(',').map((v) => v.trim());
}

// ============================================================
// Helper: hasCSSTransition
// ============================================================

/**
 * Check if an element has a CSS transition or animation defined
 * for the given transition name and type (enter/leave).
 */
export function hasCSSTransition(el: Element, name: string | undefined, type: 'enter' | 'leave'): boolean {
  if (!name) {
    // Check for any transition or animation
    const info = getTransitionInfo(el, type);
    return info.hasTransition || info.hasAnimation;
  }

  // Check for name-specific transition classes
  const fromClass = type === 'enter' ? `${name}-from` : `${name}-leave-from`;
  const activeClass = type === 'enter' ? `${name}-enter-active` : `${name}-leave-active`;
  const toClass = type === 'enter' ? `${name}-enter-to` : `${name}-leave-to`;

  const hasFromClass = el.classList.contains(fromClass);
  const hasActiveClass = el.classList.contains(activeClass);
  const hasToClass = el.classList.contains(toClass);

  if (hasActiveClass) {
    // If the active class is present, check if there's an actual CSS transition/animation
    const info = getTransitionInfo(el, type);
    return info.hasTransition || info.hasAnimation;
  }

  return hasFromClass || hasActiveClass || hasToClass;
}

// ============================================================
// Resolve transition class names
// ============================================================

function resolveTransitionClasses(
  props: TransitionProps,
  type: 'enter' | 'leave',
): { from: string; active: string; to: string } {
  const name = props.name ?? 'v';

  if (type === 'enter') {
    return {
      from: props.enterFromClass ?? `${name}-enter-from`,
      active: props.enterActiveClass ?? `${name}-enter-active`,
      to: props.enterToClass ?? `${name}-enter-to`,
    };
  } else {
    return {
      from: props.leaveFromClass ?? `${name}-leave-from`,
      active: props.leaveActiveClass ?? `${name}-leave-active`,
      to: props.leaveToClass ?? `${name}-leave-to`,
    };
  }
}

// ============================================================
// Enter transition
// ============================================================

/**
 * Perform an enter transition on the given element.
 * Supports both CSS transitions and JS hooks.
 */
export function performEnterTransition(
  el: Element,
  props: TransitionProps,
  done: () => void,
): void {
  const classes = resolveTransitionClasses(props, 'enter');

  // Call onBeforeEnter hook
  if (props.onBeforeEnter) {
    props.onBeforeEnter(el);
  }

  // Add enter-from and enter-active classes
  addTransitionClass(el, classes.from);
  addTransitionClass(el, classes.active);

  // Force reflow before removing enter-from class
  void (el as HTMLElement).offsetHeight;

  // Remove enter-from, add enter-to
  removeTransitionClass(el, classes.from);
  addTransitionClass(el, classes.to);

  // Check if there's a JS enter hook
  if (props.onEnter) {
    props.onEnter(el, () => {
      finishEnter(el, classes, props, done);
    });
  } else {
    // CSS transition: wait for transitionend/animationend
    const info = getTransitionInfo(el, 'enter');
    if (info.hasTransition || info.hasAnimation) {
      const nextDone = () => finishEnter(el, classes, props, done);
      if (info.duration > 0) {
        setTimeout(nextDone, info.duration + 50); // +50ms buffer
      } else {
        // Listen for transitionend/animationend events
        waitForTransitionEnd(el, info, nextDone);
      }
    } else {
      // No CSS transition, finish immediately
      finishEnter(el, classes, props, done);
    }
  }
}

/**
 * Finish the enter transition: remove all transition classes and call hooks.
 */
function finishEnter(
  el: Element,
  classes: { from: string; active: string; to: string },
  props: TransitionProps,
  done: () => void,
): void {
  removeTransitionClass(el, classes.active);
  removeTransitionClass(el, classes.to);

  if (props.onAfterEnter) {
    props.onAfterEnter(el);
  }

  done();
}

// ============================================================
// Leave transition
// ============================================================

/**
 * Perform a leave transition on the given element.
 * Supports both CSS transitions and JS hooks.
 */
export function performLeaveTransition(
  el: Element,
  props: TransitionProps,
  done: () => void,
): void {
  const classes = resolveTransitionClasses(props, 'leave');

  // Call onBeforeLeave hook
  if (props.onBeforeLeave) {
    props.onBeforeLeave(el);
  }

  // Add leave-from and leave-active classes
  addTransitionClass(el, classes.from);
  addTransitionClass(el, classes.active);

  // Force reflow before removing leave-from class
  void (el as HTMLElement).offsetHeight;

  // Remove leave-from, add leave-to
  removeTransitionClass(el, classes.from);
  addTransitionClass(el, classes.to);

  // Check if there's a JS leave hook
  if (props.onLeave) {
    props.onLeave(el, () => {
      finishLeave(el, classes, props, done);
    });
  } else {
    // CSS transition: wait for transitionend/animationend
    const info = getTransitionInfo(el, 'leave');
    if (info.hasTransition || info.hasAnimation) {
      const nextDone = () => finishLeave(el, classes, props, done);
      if (info.duration > 0) {
        setTimeout(nextDone, info.duration + 50); // +50ms buffer
      } else {
        waitForTransitionEnd(el, info, nextDone);
      }
    } else {
      // No CSS transition, finish immediately
      finishLeave(el, classes, props, done);
    }
  }
}

/**
 * Finish the leave transition: remove all transition classes and call hooks.
 */
function finishLeave(
  el: Element,
  classes: { from: string; active: string; to: string },
  props: TransitionProps,
  done: () => void,
): void {
  removeTransitionClass(el, classes.active);
  removeTransitionClass(el, classes.to);

  if (props.onAfterLeave) {
    props.onAfterLeave(el);
  }

  done();
}

// ============================================================
// Wait for transition/animation end
// ============================================================

/**
 * Wait for CSS transitionend or animationend events on an element.
 * Falls back to a timeout if no events are detected.
 */
function waitForTransitionEnd(
  el: Element,
  info: TransitionDurationInfo,
  done: () => void,
): void {
  let called = false;
  const finish = () => {
    if (!called) {
      called = true;
      done();
    }
  };

  // Set a safety timeout based on computed duration
  const timeout = info.duration > 0 ? info.duration + 50 : 3000;
  const timer = setTimeout(finish, timeout);

  const onEnd = (event: Event) => {
    // Only handle transitionend/animationend for this element
    if (event.target !== el) return;

    // For animationend, check if it's the right animation
    if (event.type === 'animationend') {
      const animationName = (event as AnimationEvent).animationName;
      const animations = getStylePropAsArray(getComputedStyle(el), 'animationName');
      // Only finish if this is the last animation
      if (animations.length > 1 && animations[animations.length - 1] !== animationName) {
        return;
      }
    }

    clearTimeout(timer);
    finish();
  };

  el.addEventListener('transitionend', onEnd);
  el.addEventListener('animationend', onEnd);

  // Store cleanup function on the element for cancellation
  (el as Element & { _transitionCleanup?: () => void })._transitionCleanup = () => {
    clearTimeout(timer);
    el.removeEventListener('transitionend', onEnd);
    el.removeEventListener('animationend', onEnd);
  };
}

// ============================================================
// Cancel transition
// ============================================================

/**
 * Cancel any ongoing transition on the given element.
 */
export function cancelTransition(el: Element): void {
  const cleanup = (el as Element & { _transitionCleanup?: () => void })._transitionCleanup;
  if (cleanup) {
    cleanup();
    delete (el as Element & { _transitionCleanup?: () => void })._transitionCleanup;
  }
}

// ============================================================
// Create transition state
// ============================================================

/**
 * Create a new transition state object for tracking transition lifecycle.
 */
export function createTransitionState(): TransitionState {
  return {
    isLeaving: false,
    isInserted: false,
    pendingLeaveCallback: null,
    pendingEnterCallback: null,
  };
}
