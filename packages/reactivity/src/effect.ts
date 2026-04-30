// src/effect.ts
// 响应式副作用系统核心

import { ITERATE_KEY } from "./constants";
import type { ReactiveEffectRunner } from "./types";

// ==================== 全局状态 ====================

export let activeEffect: ReactiveEffect | undefined;
let _trackDepth = 0;
const targetMap = new WeakMap<object, Map<string | symbol, Dep>>();
export let shouldTrack = true;
const trackStack: boolean[] = [];

// effectScope 支持：从 effect-scope 导入 activeEffectScope getter
import { getActiveEffectScope } from "./effect-scope";

// ==================== Dep ====================

export type Dep = Set<ReactiveEffect> & { n?: number; w?: number };

export const createDep = (): Dep => {
  const dep: Dep = new Set() as Dep;
  dep.w = 0;
  dep.n = 0;
  return dep;
};

// ==================== Track / Trigger ====================

const MAX_TRIGGER_DEPTH = 100;
let triggerDepth = 0;

export function track(target: object, _type: string, key: string | symbol) {
  if (!shouldTrack || activeEffect === undefined) return;

  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }

  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(key, (dep = createDep()));
  }

  trackEffect(dep);

  // 调试：触发 onTrack
  if (__DEV__ && activeEffect.onTrack) {
    activeEffect.onTrack({
      target,
      type: _type,
      key,
    });
  }
}

export function trackEffect(dep: Dep) {
  if (!shouldTrack || activeEffect === undefined) return;
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
  }
}

export function trigger(
  target: object,
  type: string,
  key?: string | symbol,
  _newValue?: unknown,
  _oldValue?: unknown,
) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;

  const deps: (Dep | undefined)[] = [];

  if (type === "clear") {
    deps.push(...depsMap.values());
  } else {
    if (key !== undefined) {
      deps.push(depsMap.get(key));
    }

    if (type === "add") {
      if (Array.isArray(target)) {
        deps.push(depsMap.get("length"));
      } else {
        deps.push(depsMap.get(ITERATE_KEY));
      }
    } else if (type === "delete") {
      if (!Array.isArray(target)) {
        deps.push(depsMap.get(ITERATE_KEY));
      }
    } else if (type === "set") {
      if (Array.isArray(target) && isIntegerKey(key)) {
        deps.push(depsMap.get("length"));
      }
    }
  }

  const effects: ReactiveEffect[] = [];
  for (const dep of deps) {
    if (dep) {
      for (const effect of dep) {
        effects.push(effect);
      }
    }
  }

  triggerEffects(effects);
}

export function triggerEffects(effects: ReactiveEffect[]) {
  if (triggerDepth > MAX_TRIGGER_DEPTH) {
    if (__DEV__) {
      console.warn(
        "[LyticsJS warn] Maximum trigger depth exceeded. Possible infinite reactivity loop detected.",
      );
    }
    return;
  }
  triggerDepth++;
  try {
    for (const effect of effects) {
      if (effect.computed) {
        triggerEffect(effect);
      }
    }
    for (const effect of effects) {
      if (!effect.computed) {
        triggerEffect(effect);
      }
    }
  } finally {
    triggerDepth--;
  }
}

function triggerEffect(effect: ReactiveEffect) {
  if (effect !== activeEffect || effect.allowRecurse) {
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      effect.run();
    }
  }
}

// ==================== ReactiveEffect ====================

export class ReactiveEffect<T = any> {
  active = true;
  deps: Dep[] = [];
  parent: ReactiveEffect | undefined = undefined;
  computed?: boolean;
  allowRecurse?: boolean;
  onStop?: () => void;
  onTrack?: (event: {
    target: object;
    key: string | symbol;
    type: string;
  }) => void;
  onTrigger?: (event: {
    target: object;
    key: string | symbol;
    type: string;
    newValue?: unknown;
    oldValue?: unknown;
  }) => void;
  // 运行前清理（onEffectCleanup 注册的）
  _cleanups: Array<() => void> = [];

  constructor(
    public fn: () => T,
    public scheduler?: (...args: any[]) => any,
  ) {
    // 自动注册到当前活跃的 effectScope
    const scope = getActiveEffectScope();
    if (scope && scope.active) {
      scope.effects.push(this);
    }
  }

  run(): T | undefined {
    if (!this.active) {
      try {
        return this.fn();
      } catch (e) {
        if (__DEV__) {
          console.warn("[LyticsJS warn] Error running inactive effect:", e);
        }
        throw e;
      }
    }

    // 在重新执行前调用 cleanup
    if (this._cleanups.length > 0) {
      for (let i = 0; i < this._cleanups.length; i++) {
        this._cleanups[i]!();
      }
      this._cleanups.length = 0;
    }

    try {
      this.parent = activeEffect;
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      activeEffect = this;
      shouldTrack = true;
      _trackDepth++;

      return this.fn();
    } finally {
      _trackDepth--;
      activeEffect = this.parent;
      shouldTrack = activeEffect ? activeEffect.allowRecurse !== false : true;
      this.parent = undefined;
    }
  }

  stop(): void {
    if (this.active) {
      cleanupEffect(this);
      if (this._cleanups.length > 0) {
        for (let i = 0; i < this._cleanups.length; i++) {
          this._cleanups[i]!();
        }
        this._cleanups.length = 0;
      }
      if (this.onStop) this.onStop();
      this.active = false;
    }
  }
}

function cleanupEffect(effect: ReactiveEffect) {
  const { deps } = effect;
  for (let i = 0; i < deps.length; i++) {
    deps[i]!.delete(effect);
  }
  deps.length = 0;
}

// ==================== 公共 API ====================

export function effect<T = any>(
  fn: () => T,
  options?: {
    lazy?: boolean;
    scheduler?: (...args: any[]) => any;
    allowRecurse?: boolean;
    onStop?: () => void;
    onTrack?: (event: {
      target: object;
      key: string | symbol;
      type: string;
    }) => void;
    onTrigger?: (event: {
      target: object;
      key: string | symbol;
      type: string;
      newValue?: unknown;
      oldValue?: unknown;
    }) => void;
  },
): ReactiveEffectRunner<T> {
  const _effect = new ReactiveEffect(fn);
  if (options) {
    Object.assign(_effect, options);
  }
  if (!options || !options.lazy) {
    _effect.run();
  }
  const runner = _effect.run.bind(_effect) as ReactiveEffectRunner<T>;
  runner.effect = _effect;
  return runner;
}

export function stop(runner: ReactiveEffectRunner): void {
  runner.effect.stop();
}

export function pauseTracking(): void {
  trackStack.push(shouldTrack);
  shouldTrack = false;
}

export function enableTracking(): void {
  trackStack.push(shouldTrack);
  shouldTrack = true;
}

export function resetTracking(): void {
  const last = trackStack.pop();
  shouldTrack = last === undefined ? true : last;
}

export function batch(fn: () => void): void {
  pauseTracking();
  try {
    fn();
  } finally {
    resetTracking();
  }
}

export function onEffectCleanup(fn: () => void, failSilently = false): void {
  if (activeEffect === undefined && !failSilently) {
    if (__DEV__) {
      console.warn(
        "onEffectCleanup() was called when there was no active effect to associate with.",
      );
    }
    return;
  }
  if (activeEffect) {
    activeEffect._cleanups.push(fn);
  }
}

// ==================== 辅助 ====================

export function isIntegerKey(key: unknown): boolean {
  return (
    typeof key === "string" &&
    key !== "NaN" &&
    key[0] !== "-" &&
    "" + parseInt(key, 10) === key
  );
}
