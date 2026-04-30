// src/keep-alive.ts
// KeepAlive component (simplified)

import { isString, isArray } from "@lytjs/common-is";
import type { ComponentInternalInstance, ComponentOptions } from "./types";
import { createComponentInstance, setupComponent } from "./component";
import { handleError } from "./lifecycle";
import { ShapeFlags } from "@lytjs/common-vnode";
import type { VNode } from "@lytjs/common-vnode";

// ==================== Types ====================

interface KeepAliveCache {
  get(key: string): ComponentInternalInstance | undefined;
  set(key: string, instance: ComponentInternalInstance): void;
  delete(key: string): boolean;
  has(key: string): boolean;
  forEach(
    callback: (value: ComponentInternalInstance, key: string) => void,
  ): void;
}

// ==================== KeepAlive Component ====================

export interface KeepAliveProps {
  include?: string | RegExp | (string | RegExp)[];
  exclude?: string | RegExp | (string | RegExp)[];
  max?: number;
}

export const KeepAlive: ComponentOptions = {
  name: "KeepAlive",

  props: {
    include: {},
    exclude: {},
    max: { type: Number, default: undefined },
  },

  setup(_props: any, _ctx: any) {
    const cache: KeepAliveCache = new Map();
    const keys: Set<string> = new Set();

    return {
      cache,
      keys,
    };
  },

  created() {
    // KeepAlive instance init
  },
};

// ==================== KeepAlive helpers ====================

/**
 * Create a KeepAlive component instance.
 */
export function createKeepAliveInstance(
  props: KeepAliveProps = {},
  parent: ComponentInternalInstance | null = null,
): ComponentInternalInstance {
  const vnode: VNode = {
    type: KeepAlive,
    props: {
      ...props,
      include: props.include,
      exclude: props.exclude,
      max: props.max,
    },
    children: null,
    key: null,
    ref: null,
    isStatic: false,
    isStaticRoot: false,
    isOnce: false,
    isAsyncPlaceholder: false,
    isComment: false,
    isCloned: false,
    isBlockTree: false,
    shapeFlag: ShapeFlags.STATEFUL_COMPONENT,
    patchFlag: 0,
    dynamicProps: null,
    dynamicChildren: null,
    component: null,
    el: null,
    anchor: null,
    target: null,
    targetAnchor: null,
    targetStart: null,
    loc: null,
    __v_isVNode: true,
  };

  const instance = createComponentInstance(vnode, parent);
  setupComponent(instance);
  return instance;
}

/**
 * Check if a component name matches the include/exclude patterns.
 */
export function matchesPattern(
  name: string | undefined,
  pattern: string | RegExp | (string | RegExp)[] | undefined,
): boolean {
  if (!pattern || !name) return true;

  if (isString(pattern)) {
    return name === pattern;
  }

  if (pattern instanceof RegExp) {
    return pattern.test(name);
  }

  if (isArray(pattern)) {
    return pattern.some((p) => matchesPattern(name, p));
  }

  return true;
}

/**
 * Cache a component instance in KeepAlive.
 */
export function cacheInstance(
  keepAlive: ComponentInternalInstance,
  key: string,
  instance: ComponentInternalInstance,
): void {
  const cache = keepAlive.setupState.cache as KeepAliveCache;
  const keys = keepAlive.setupState.keys as Set<string>;
  const max = keepAlive.props.max as number | undefined;

  // If already cached, remove old entry first
  if (cache.has(key)) {
    cache.delete(key);
    keys.delete(key);
  }

  cache.set(key, instance);
  keys.add(key);

  // Prune oldest if max exceeded
  if (max !== undefined && keys.size > max) {
    const oldestKey = keys.values().next().value;
    if (oldestKey !== undefined) {
      const oldestInstance = cache.get(oldestKey);
      // Call deactivated lifecycle hook before eviction
      if (oldestInstance) {
        deactivateInstance(oldestInstance);
        // Stop all reactive effects to prevent memory leaks
        oldestInstance.effects?.forEach((effect: any) => {
          if (typeof effect.stop === "function") {
            effect.stop();
          }
        });
      }
      cache.delete(oldestKey);
      keys.delete(oldestKey);
    }
  }
}

/**
 * Get a cached instance from KeepAlive.
 */
export function getCachedInstance(
  keepAlive: ComponentInternalInstance,
  key: string,
): ComponentInternalInstance | undefined {
  const cache = keepAlive.setupState.cache as KeepAliveCache;
  return cache.get(key);
}

/**
 * Remove a cached instance from KeepAlive.
 */
export function removeCachedInstance(
  keepAlive: ComponentInternalInstance,
  key: string,
): boolean {
  const cache = keepAlive.setupState.cache as KeepAliveCache;
  const keys = keepAlive.setupState.keys as Set<string>;
  keys.delete(key);
  return cache.delete(key);
}

/**
 * Activate a cached component instance.
 */
export function activateInstance(instance: ComponentInternalInstance): void {
  instance.isDeactivated = false;
  // Call activated hook if defined
  if (instance.type.activated) {
    instance.type.activated.call(instance.ctx);
  }
  if (instance.activatedHooks) {
    for (const hook of instance.activatedHooks) {
      try {
        hook();
      } catch (e) {
        handleError(e as Error, instance, "activated hook");
      }
    }
  }
}

/**
 * Deactivate a component instance.
 */
export function deactivateInstance(instance: ComponentInternalInstance): void {
  instance.isDeactivated = true;
  // Call deactivated hook if defined
  if (instance.type.deactivated) {
    instance.type.deactivated.call(instance.ctx);
  }
  if (instance.deactivatedHooks) {
    for (const hook of instance.deactivatedHooks) {
      try {
        hook();
      } catch (e) {
        handleError(e as Error, instance, "deactivated hook");
      }
    }
  }
}
