/**
 * @lytjs/vdom - transition-group
 * TransitionGroup component support using FLIP animation technique
 * Provides smooth list item transitions: enter, leave, and move
 */

import type { TransitionProps } from './transition';
import {
  addTransitionClass,
  removeTransitionClass,
  getTransitionInfo,
  performEnterTransition,
  performLeaveTransition,
} from './transition';

// ============================================================
// TransitionGroupProps
// ============================================================

export interface TransitionGroupProps extends TransitionProps {
  /** Container tag name. If false/undefined, no container element is rendered. */
  tag?: string | false;
  /** Whether to also apply move transitions using FLIP technique */
  moveClass?: string;
}

// ============================================================
// FLIP animation state
// ============================================================

interface FLIPState {
  /** Map of element keys to their old positions (before DOM update) */
  oldPositions: Map<string, DOMRect>;
  /** Map of element keys to their new positions (after DOM update) */
  newPositions: Map<string, DOMRect>;
}

// ============================================================
// FLIP animation helpers
// ============================================================

/**
 * Record the current positions of all child elements.
 * Should be called before the DOM update (in beforeUpdate).
 */
export function recordPositions(children: Element[]): Map<string, DOMRect> {
  const positions = new Map<string, DOMRect>();
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (!child) continue;
    const key = getChildKey(child, i);
    if (key !== null) {
      positions.set(key, child.getBoundingClientRect());
    }
  }
  return positions;
}

/**
 * Get a unique key for a child element.
 * Checks for a `data-key` attribute, then falls back to element index.
 * Using tagName as fallback causes key collisions for same-type elements.
 */
function getChildKey(el: Element, index: number): string | null {
  const key = el.getAttribute('data-key');
  if (key !== null) return key;
  // 使用索引作为 fallback，避免同类型元素的 key 冲突
  return `__idx_${index}`;
}

/**
 * Apply FLIP animation to moved elements.
 * Compares old and new positions, applies inverse transform, then animates to final position.
 */
export function applyFLIP(
  children: Element[],
  oldPositions: Map<string, DOMRect>,
  moveClass: string,
): void {
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (!child) continue;
    const key = getChildKey(child, i);
    if (key === null) continue;

    const oldRect = oldPositions.get(key);
    if (!oldRect) continue;

    const newRect = child.getBoundingClientRect();

    // Check if the element has actually moved
    const dx = oldRect.left - newRect.left;
    const dy = oldRect.top - newRect.top;

    if (dx === 0 && dy === 0) continue;

    // Invert: apply the opposite transform to make it appear in the old position
    (child as HTMLElement).style.transform = `translate(${dx}px, ${dy}px)`;
    (child as HTMLElement).style.transition = 'none';

    // Force reflow
    void (child as HTMLElement).offsetHeight;

    // Remove the transform to let it animate to the new position
    (child as HTMLElement).style.transform = '';
    (child as HTMLElement).style.transition = '';

    // Add move class for CSS transition
    addTransitionClass(child, moveClass);

    // Check if the element has a CSS transition for the move
    const info = getTransitionInfo(child, 'enter');
    if (!info.hasTransition && !info.hasAnimation) {
      // No CSS transition defined for move, remove the class immediately
      removeTransitionClass(child, moveClass);
    } else {
      // Wait for the move transition to complete
      const cleanup = () => {
        removeTransitionClass(child, moveClass);
        child.removeEventListener('transitionend', onMoveEnd);
        child.removeEventListener('animationend', onMoveEnd);
      };

      const onMoveEnd = (event: Event) => {
        if (event.target !== child) return;
        cleanup();
      };

      child.addEventListener('transitionend', onMoveEnd);
      child.addEventListener('animationend', onMoveEnd);

      // Safety timeout
      const duration = info.duration > 0 ? info.duration + 50 : 3000;
      setTimeout(cleanup, duration);
    }
  }
}

// ============================================================
// TransitionGroup enter/leave
// ============================================================

/**
 * Perform enter transition for a new child element in a TransitionGroup.
 */
export function performGroupEnterTransition(
  el: Element,
  props: TransitionGroupProps,
  done: () => void,
): void {
  performEnterTransition(el, props, done);
}

/**
 * Perform leave transition for a removed child element in a TransitionGroup.
 * After the leave transition completes, the element is removed from the DOM.
 */
export function performGroupLeaveTransition(
  el: Element,
  props: TransitionGroupProps,
  removeElement: () => void,
): void {
  performLeaveTransition(el, props, () => {
    removeElement();
  });
}

// ============================================================
// TransitionGroup state management
// ============================================================

/**
 * Create FLIP state for tracking position changes.
 */
export function createFLIPState(): FLIPState {
  return {
    oldPositions: new Map(),
    newPositions: new Map(),
  };
}

/**
 * Prepare for a DOM update by recording current child positions.
 */
export function beforeUpdate(state: FLIPState, children: Element[]): void {
  state.oldPositions = recordPositions(children);
}

/**
 * After DOM update, apply FLIP animations for moved elements.
 */
export function afterUpdate(
  state: FLIPState,
  children: Element[],
  moveClass: string,
): void {
  state.newPositions = recordPositions(children);
  applyFLIP(children, state.oldPositions, moveClass);
}
